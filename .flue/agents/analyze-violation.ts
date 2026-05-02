import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = {};

/** Write a file via shell using base64 to avoid escaping issues. */
async function writeFile(
  session: { shell: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }> },
  path: string,
  content: string
) {
  const b64 = Buffer.from(content, 'utf-8').toString('base64');
  const { exitCode, stderr } = await session.shell(`printf "%s" "${b64}" | base64 -d > ${path}`);
  if (exitCode !== 0) {
    throw new Error(`Failed to write ${path}: ${stderr}`);
  }
}

export default async function ({ init }: FlueContext) {
  const agent = await init({
    sandbox: 'local',
    model: 'openai/gpt-4.1',
  });
  const session = await agent.session();

  // ── 1. Extract violation from trace ──────────────────────────────────────
  const { stdout: violationJson } = await session.shell(
    `jq -s 'map(select(.violations | length > 0)) | .[0]' bombadil-results/trace.jsonl`
  );

  const violation = JSON.parse(violationJson || '{}');
  const uncaughtExceptions =
    violation?.snapshots?.find((s: any) => s.name === 'uncaughtExceptions')?.value || [];
  const stackTrace = uncaughtExceptions[0] || '';

  const errorMatch = stackTrace.match(/Uncaught (\w+Error):\s*(.+)/);
  const errorType = errorMatch ? errorMatch[1] : 'Unknown';
  const errorMessage = errorMatch ? errorMatch[2] : stackTrace;

  const { stdout: actionsJson } = await session.shell(
    `jq -s 'map(select(.action != null and .action != "Wait")) | .[-10:] | map({action: .action, timestamp: .timestamp})' bombadil-results/trace.jsonl 2>/dev/null || echo '[]'`
  );

  // ── 2. Parse function names from stack ───────────────────────────────────
  const frameRegex = /at\s+([\w$]+)\s+\([^)]+\)/g;
  const functionNames: string[] = [];
  let m;
  while ((m = frameRegex.exec(stackTrace)) !== null) {
    functionNames.push(m[1]);
  }

  const appFunctions = functionNames.filter(
    (name) =>
      ![
        'renderWithHooks',
        'updateFunctionComponent',
        'beginWork',
        'performUnitOfWork',
        'workLoopSync',
        'renderRootSync',
        'performWorkOnRoot',
        'performSyncWorkOnRoot',
        'flushSyncWorkAcrossRoots_impl',
        'processRootScheduleInMicrotask',
      ].includes(name)
  );

  // ── 3. Search source for each function ───────────────────────────────────
  const searchResults = await Promise.all(
    appFunctions.map(async (funcName) => {
      try {
        const { stdout: hits } = await session.shell(
          `rg -n "(function|const|let|var|export)\\s+${funcName}\\b|\\b${funcName}\\s*[=:]" src/ --type ts --type tsx 2>/dev/null | head -10 || true`
        );
        return { funcName, hits };
      } catch {
        return { funcName, hits: '' };
      }
    })
  );

  const fileMap: Record<string, { file: string; line: number }> = {};
  for (const { funcName, hits } of searchResults) {
    if (hits.trim()) {
      const firstLine = hits.trim().split('\n')[0];
      const match = firstLine.match(/^([^:]+):(\d+):/);
      if (match && !fileMap[funcName]) {
        fileMap[funcName] = { file: match[1], line: parseInt(match[2], 10) };
      }
    }
  }

  const primaryFunc = appFunctions[0];
  const secondaryFuncs = appFunctions.slice(1);

  const primaryFile = primaryFunc && fileMap[primaryFunc] ? fileMap[primaryFunc] : null;
  const secondaryFiles = secondaryFuncs
    .map((f) => fileMap[f])
    .filter(Boolean) as { file: string; line: number }[];

  if (!primaryFile) {
    await writeFile(
      session,
      'flue-comment.md',
      buildFallbackComment('Could not locate source for function from stack trace.', stackTrace)
    );
    return { status: 'fallback', reason: 'no_primary_file' };
  }

  // ── 4. Read source files ─────────────────────────────────────────────────
  const { stdout: primaryContent } = await session.shell(
    `cat ${primaryFile.file} 2>/dev/null || echo "FILE_NOT_FOUND"`
  );
  if (primaryContent === 'FILE_NOT_FOUND') {
    await writeFile(
      session,
      'flue-comment.md',
      buildFallbackComment(`Could not read file: ${primaryFile.file}`, stackTrace)
    );
    return { status: 'fallback', reason: 'file_not_found' };
  }

  const secondaryContents = (
    await Promise.all(
      secondaryFiles.map(async (sf) => {
        try {
          const { stdout: content } = await session.shell(`cat ${sf.file} 2>/dev/null || echo ""`);
          return content ? `--- ${sf.file} ---\n${content}` : '';
        } catch {
          return '';
        }
      })
    )
  ).filter(Boolean);

  // ── 5. LLM diagnosis ─────────────────────────────────────────────────────
  const diagnosis = await session.prompt(
    `You are an expert frontend debugger analyzing a production app crash found by fuzzy testing.\n\n` +
      `ERROR TYPE: ${errorType}\n` +
      `ERROR MESSAGE: ${errorMessage}\n\n` +
      `STACK TRACE:\n${stackTrace}\n\n` +
      `LAST ACTIONS BEFORE CRASH:\n${actionsJson}\n\n` +
      `PRIMARY SOURCE FILE (${primaryFile.file}, line ~${primaryFile.line}):\n${primaryContent}\n\n` +
      (secondaryContents.length > 0
        ? `CALLER FILES:\n${secondaryContents.join('\n\n')}\n\n`
        : '') +
      `Your task:\n` +
      `1. Analyze the error message and stack trace carefully.\n` +
      `2. The error occurred in function "${primaryFunc}" in ${primaryFile.file}.\n` +
      `3. Identify the EXACT line number and root cause.\n` +
      `4. Consider how the error message relates to the code.\n\n` +
      `Return ONLY the file path and line number.`,
    {
      result: v.object({
        file: v.string(),
        line: v.number(),
      }),
    }
  );

  // ── 6. Read target file for fix generation ───────────────────────────────
  const targetFile = diagnosis.file || primaryFile.file;
  const { stdout: targetContent } = await session.shell(
    `cat ${targetFile} 2>/dev/null || echo "FILE_NOT_FOUND"`
  );
  if (targetContent === 'FILE_NOT_FOUND') {
    await writeFile(
      session,
      'flue-comment.md',
      buildFallbackComment(`Could not read file: ${targetFile}`, stackTrace)
    );
    return { status: 'fallback', reason: 'target_file_not_found' };
  }

  // ── 7. LLM fix generation ────────────────────────────────────────────────
  const fixText = await session.prompt(
    `You are fixing a bug in ${targetFile}.\n\n` +
      `ERROR: ${errorType}: ${errorMessage}\n\n` +
      `STACK TRACE CONTEXT:\n` +
      `- Error occurred in function: ${primaryFunc}\n` +
      `- Called from: ${secondaryFuncs.join(', ')}\n\n` +
      `FULL FILE CONTENT:\n${targetContent}\n\n` +
      `RULES:\n` +
      `1. oldString must be an EXACT, UNIQUE substring from the file above.\n` +
      `2. newString must be the corrected version.\n` +
      `3. Preserve ALL existing logic, comments, and formatting.\n` +
      `4. Only change what is necessary to fix the bug.\n` +
      `5. Do NOT invent new regex patterns or logic.\n\n` +
      `OUTPUT FORMAT (strict):\n` +
      `EXPLANATION: <one sentence describing the fix>\n` +
      `OLD:\n<exact old code>\n` +
      `NEW:\n<exact new code>\n` +
      `END`
  );

  const fixTextStr =
    typeof fixText === 'string' ? fixText : (fixText as any)?.text || String(fixText);
  const explanationMatch = fixTextStr.match(/EXPLANATION:\s*(.+)/);
  const oldMatch = fixTextStr.match(/OLD:\n([\s\S]+?)\nNEW:/);
  const newMatch = fixTextStr.match(/NEW:\n([\s\S]+?)\nEND/);

  const explanation = explanationMatch ? explanationMatch[1] : '';
  const oldString = oldMatch ? oldMatch[1].trimEnd() : '';
  const newString = newMatch ? newMatch[1].trimEnd() : '';

  // ── 8. Build and write PR comment ────────────────────────────────────────
  const commentMarkdown = buildComment({
    file: targetFile,
    line: diagnosis.line,
    errorType,
    errorMessage,
    primaryFunc,
    secondaryFuncs,
    explanation,
    oldString,
    newString,
  });

  await writeFile(session, 'flue-comment.md', commentMarkdown);

  // Also write structured JSON for downstream automation
  const resultJson = JSON.stringify(
    {
      diagnosis: {
        file: targetFile,
        line: diagnosis.line,
        errorType,
        errorMessage,
        primaryFunc,
        callerFuncs: secondaryFuncs,
      },
      fix: { oldString, newString, explanation },
    },
    null,
    2
  );
  await writeFile(session, 'flue-result.json', resultJson);

  return { status: 'success', file: targetFile, line: diagnosis.line };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildComment(data: {
  file: string;
  line: number;
  errorType: string;
  errorMessage: string;
  primaryFunc: string;
  secondaryFuncs: string[];
  explanation: string;
  oldString: string;
  newString: string;
}): string {
  const diffOld = data.oldString
    .split('\n')
    .map((l) => `- ${l}`)
    .join('\n');
  const diffNew = data.newString
    .split('\n')
    .map((l) => `+ ${l}`)
    .join('\n');

  const hasFix = data.oldString && data.newString;

  let body = `## 🐛 Bombadil Fuzzy Test Failure

Bombadil detected property violations during fuzzy testing.

### Diagnosis

| | |
|---|---|
| **File** | \`${data.file}\` |
| **Line** | \`${data.line}\` |
| **Function** | \`${data.primaryFunc}\` |

**Error:** ${data.errorType}: \`${data.errorMessage}\`
`;

  if (data.secondaryFuncs.length > 0) {
    body += `\n**Call stack:** ${data.primaryFunc} ← ${data.secondaryFuncs.join(' ← ')}\n`;
  }

  if (hasFix) {
    body += `
### Proposed Fix

\`\`\`diff
${diffOld}
${diffNew}
\`\`\`

**Explanation:** ${data.explanation}
`;
  }

  body += `
### Action Sequence

See the uploaded artifact \`bombadil-results\` for the full trace, screenshots, and state transitions.

You can inspect locally with:
\`\`\`bash
npx bombadil inspect bombadil-results
\`\`\`
`;

  return body;
}

function buildFallbackComment(reason: string, stackTrace: string): string {
  return `## 🐛 Bombadil Fuzzy Test Failure

Bombadil detected property violations during fuzzy testing.

### Diagnosis

${reason}

**Stack trace:**
\`\`\`
${stackTrace || 'N/A'}
\`\`\`

### Action Sequence

See the uploaded artifact \`bombadil-results\` for the full trace, screenshots, and state transitions.

You can inspect locally with:
\`\`\`bash
npx bombadil inspect bombadil-results
\`\`\`
`;
}

import type { FlueContext } from '@flue/sdk/client';
import * as v from 'valibot';

export const triggers = {};

export default async function ({ init }: FlueContext) {
  const agent = await init({
    sandbox: 'local',
    model: 'openai/gpt-5.1',
  });
  const session = await agent.session();

  // Extract violation names and error messages
  const { stdout: violations } = await session.shell(
    `jq -r 'select(.violations | length > 0) | "PROPERTY: " + .violations[0].name + "\\nMESSAGE: " + (.violations[0].violation.Always.violation.False.condition // "N/A") + "\\n---"' bombadil-results/trace.jsonl | head -5`
  );

  const result = await session.prompt(
    `You are analyzing a Bombadil fuzzy test failure for a React checkout form app.\n\n` +
    `Here are the violations found:\n${violations}\n\n` +
    `Search the codebase (src/) for the likely cause. Read relevant files. ` +
    `Then provide a concise analysis linking the error to source code.`,
    {
      result: v.object({
        propertyViolated: v.string(),
        errorSummary: v.string(),
        likelySourceFiles: v.array(v.string()),
        rootCause: v.string(),
        suggestedFix: v.string(),
      }),
    },
  );

  return result;
}

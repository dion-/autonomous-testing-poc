interface NavigationProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onBack: () => void
  onSkipTo: (step: number) => void
  canProceed: boolean
}

const steps = [
  { label: 'Personal', icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )},
  { label: 'Shipping', icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )},
  { label: 'Preferences', icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.43.816 1.035.796 1.765-.02.718-.376 1.32-.92 1.734a2.866 2.866 0 01-3.42 0 2.866 2.866 0 01-.92-1.734c-.02-.73.3-1.335.796-1.765m0 3.46a23.847 23.847 0 01-.59 4.59m.59-4.59a18.03 18.03 0 01-.59-4.59m0 0a23.848 23.848 0 018.835 2.535m-8.835-2.535a23.847 23.847 0 008.835-2.535" />
    </svg>
  )},
  { label: 'Review', icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )},
]

export function Navigation({
  currentStep,
  onSkipTo,
}: NavigationProps) {
  return (
    <nav aria-label="Checkout progress" className="w-full md:w-60 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 flex-shrink-0">
      <div className="p-4 md:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 px-3">Checkout</h2>
        <p className="text-xs text-gray-500 px-3 mb-4 hidden md:block">Complete your order</p>
        <ol className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {steps.map((s, i) => {
            const isActive = i === currentStep
            const isCompleted = i < currentStep
            return (
              <li key={i} className="flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onSkipTo(i)}
                  className={`
                    w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left
                    ${isActive
                      ? 'bg-gray-100 text-gray-900'
                      : isCompleted
                        ? 'text-gray-700 hover:bg-gray-100/60'
                        : 'text-gray-500 hover:bg-gray-100/60'
                    }
                  `}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className={`
                    flex-shrink-0
                    ${isActive ? 'text-gray-900' : isCompleted ? 'text-gray-700' : 'text-gray-400'}
                  `}>
                    {s.icon}
                  </span>
                  <span className="hidden md:inline">{s.label}</span>
                  {isCompleted && (
                    <span className="ml-auto hidden md:flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-white">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

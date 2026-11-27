import { useNavigate } from 'react-router-dom'

export default function CreditLimitModal({ open, onClose, usage }) {
  const navigate = useNavigate()

  if (!open) return null

  const limit = usage?.prompts_limit ?? 3

  const goToPlans = () => {
    onClose?.()
    navigate('/plans')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="credit-limit-title"
        aria-modal="true"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-2xl">
          ⚠
        </div>
        <h2 id="credit-limit-title" className="text-xl font-semibold text-white">
          Credit limit reached
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          You have used your <strong className="text-white">{limit} free Gemini prompts</strong>.
          Upgrade to a paid plan (Google AI–style tiers + 20% platform fee) to keep chatting.
        </p>
        {usage && (
          <p className="mt-2 text-xs text-slate-500">
            Prompts used: {usage.prompts_used}
            {usage.prompts_limit != null ? ` / ${usage.prompts_limit}` : ''}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={goToPlans}
            className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            View payment plans
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-600 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
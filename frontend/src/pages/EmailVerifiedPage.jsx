import { Link } from 'react-router-dom'

export default function EmailVerifiedPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[var(--chat-bg)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[var(--chat-surface)] p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Email verified</h1>
        <p className="mt-3 text-sm text-slate-400">Your account is ready. You can start chatting.</p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Go to chat
        </Link>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function UsageDashboardPage() {
  const { user } = useAuth()
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/usage')
      .then((res) => setUsage(res.data.usage))
      .catch(() => setError('Could not load usage.'))
      .finally(() => setLoading(false))
  }, [])

  const percentUsed =
    usage?.prompts_limit != null && usage.prompts_limit > 0
      ? Math.min(100, (usage.prompts_used / usage.prompts_limit) * 100)
      : 0

  return (
    <div className="min-h-full bg-[var(--chat-bg)] px-4 py-10 text-[var(--chat-text)]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-400">Account</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Usage dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">
              Track prompts, images, and plan limits for {user?.email}
            </p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-[var(--chat-border)] px-4 py-2 text-sm text-slate-300 hover:bg-[var(--chat-surface-elevated)]"
          >
            ← Back to chat
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading usage…</p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
              <h2 className="text-lg font-medium text-white">Current plan</h2>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">
                {usage?.plan_name || (usage?.free_tier ? 'Free trial' : '—')}
              </p>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Member since</dt>
                  <dd className="text-slate-200">{formatDate(usage?.member_since)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Subscribed</dt>
                  <dd className="text-slate-200">
                    {usage?.is_subscribed ? formatDate(usage?.subscribed_at) : 'Not subscribed'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email verified</dt>
                  <dd className="text-slate-200">{usage?.email_verified ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Image generation</dt>
                  <dd className="text-slate-200">{usage?.allows_image ? 'Enabled' : 'Not on plan'}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
              <h2 className="text-lg font-medium text-white">Prompt usage</h2>
              {usage?.is_unlimited ? (
                <p className="mt-3 text-emerald-300">Unlimited prompts on your plan.</p>
              ) : (
                <>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {usage?.prompts_used} / {usage?.prompts_limit ?? '—'} used
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {usage?.prompts_remaining} remaining
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                </>
              )}
            </section>

            {usage?.streak && (
              <section className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 to-[var(--chat-surface)] p-6">
                <h2 className="text-lg font-medium text-white">Streak & weekly recap</h2>
                <p className="mt-3 text-3xl font-semibold text-orange-200">
                  🔥 {usage.streak.current_streak_days} day streak
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Best: {usage.streak.longest_streak_days} days
                  {usage.streak.weekly_recap
                    ? ` · ${usage.streak.weekly_recap.prompts_this_week} prompts this week`
                    : ''}
                </p>
              </section>
            )}

            <section className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
              <h2 className="text-lg font-medium text-white">Activity</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Conversations</dt>
                  <dd className="text-xl font-semibold text-white">{usage?.conversations_count ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Images generated</dt>
                  <dd className="text-xl font-semibold text-white">{usage?.images_generated ?? 0}</dd>
                </div>
              </dl>
            </section>

            {usage?.credit_limit_reached && (
              <Link
                to="/plans"
                className="block rounded-xl bg-emerald-600 py-3 text-center text-sm font-medium text-white hover:bg-emerald-500"
              >
                Upgrade plan
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
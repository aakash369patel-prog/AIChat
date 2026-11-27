import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'users', label: 'Users' },
  { id: 'ai', label: 'AI credentials' },
  { id: 'account', label: 'My account' },
]

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500'

export default function AdminPanelPage() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState('analytics')

  return (
    <div className="min-h-full bg-[var(--chat-bg)] text-[var(--chat-text)]">
      <header className="border-b border-[var(--chat-border)] bg-[var(--chat-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Admin panel</h1>
            <p className="text-sm text-slate-400">Manage users, subscriptions, and AI credentials</p>
          </div>
          <Link
            to="/"
            className="rounded-lg border border-[var(--chat-border)] px-4 py-2 text-sm text-slate-300 transition hover:border-emerald-500/40 hover:text-white"
          >
            Back to chat
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-[var(--chat-surface-elevated)] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === 'analytics' && <AnalyticsSection />}
        {tab === 'users' && <UsersSection />}
        {tab === 'ai' && <AiSettingsSection />}
        {tab === 'account' && <AccountSection user={user} refreshUser={refreshUser} />}
      </main>
    </div>
  )
}

function AnalyticsSection() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/admin/analytics')
      .then((res) => setData(res.data.analytics))
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-slate-400">Loading analytics…</p>
  }

  if (error) {
    return <p className="text-red-300">{error}</p>
  }

  const plans = data?.subscribers_by_plan || {}

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={data?.users_total} />
        <StatCard label="Verified emails" value={data?.users_verified} />
        <StatCard label="Signups (7d)" value={data?.signups_last_7_days} />
        <StatCard label="Messages today" value={data?.messages_today} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Conversations" value={data?.conversations_total} />
        <StatCard label="Images (30d)" value={data?.image_messages_last_30_days} />
        <div className="rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Subscribers by plan</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-200">
            {Object.keys(plans).length === 0 && <li className="text-slate-500">No active subscriptions</li>}
            {Object.entries(plans).map(([planId, count]) => (
              <li key={planId} className="flex justify-between">
                <span>{planId}</span>
                <span className="font-medium">{count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-slate-500">Updated {data?.generated_at || '—'}</p>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value ?? '—'}</p>
    </div>
  )
}

function UsersSection() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyUserForm())
  const [editing, setEditing] = useState(null)

  const load = useCallback(async (q = '') => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/users', { params: q ? { search: q } : {} })
      setUsers(res.data.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSearch = (e) => {
    e.preventDefault()
    load(search.trim())
  }

  const startEdit = (u) => {
    setEditing(u.id)
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      is_admin: Boolean(u.is_admin),
      is_subscribed: Boolean(u.is_subscribed),
      subscribed_plan: u.subscribed_plan || '',
    })
  }

  const resetForm = () => {
    setEditing(null)
    setForm(emptyUserForm())
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = {
        name: form.name,
        email: form.email,
        is_admin: form.is_admin,
        is_subscribed: form.is_subscribed,
        subscribed_plan: form.subscribed_plan || null,
      }
      if (form.password) {
        body.password = form.password
      }

      if (editing) {
        await api.patch(`/admin/users/${editing}`, body)
      } else {
        if (!form.password) {
          setError('Password is required for new users.')
          return
        }
        await api.post('/admin/users', { ...body, password: form.password })
      }
      resetForm()
      await load(search.trim())
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed.')
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    setError('')
    try {
      await api.delete(`/admin/users/${id}`)
      await load(search.trim())
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.')
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,min(22rem,100%)]">
      <section className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className={inputClass}
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate-400">Loading users…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2 pr-3 font-medium">Name</th>
                  <th className="pb-2 pr-3 font-medium">Email</th>
                  <th className="pb-2 pr-3 font-medium">Role</th>
                  <th className="pb-2 pr-3 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/80">
                    <td className="py-3 pr-3">{u.name}</td>
                    <td className="py-3 pr-3 text-slate-400">{u.email}</td>
                    <td className="py-3 pr-3">{u.is_admin ? 'Admin' : 'User'}</td>
                    <td className="py-3 pr-3">
                      {u.is_subscribed ? u.subscribed_plan || 'subscribed' : 'Free'}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(u.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="mt-4 text-slate-500">No users found.</p>}
          </div>
        )}
      </section>

      <section className="h-fit rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
        <h2 className="mb-4 text-lg font-medium text-white">{editing ? 'Edit user' : 'New user'}</h2>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field
            label={editing ? 'New password (optional)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
          />
          <Field
            label="Subscribed plan"
            value={form.subscribed_plan}
            onChange={(v) => setForm({ ...form, subscribed_plan: v })}
            placeholder="gemini_starter, gemini_pro, …"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.is_admin}
              onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
            />
            Administrator
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.is_subscribed}
              onChange={(e) => setForm({ ...form, is_subscribed: e.target.checked })}
            />
            Subscribed
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              {editing ? 'Save changes' : 'Create user'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}

function AiSettingsSection() {
  const [settings, setSettings] = useState(null)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('')
  const [geminiImageModel, setGeminiImageModel] = useState('')
  const [clearKey, setClearKey] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await api.get('/admin/settings/ai')
    const s = res.data.settings
    setSettings(s)
    setGeminiModel(s.gemini_model || '')
    setGeminiImageModel(s.gemini_image_model || '')
  }, [])

  useEffect(() => {
    load().catch(() => setError('Failed to load AI settings.'))
  }, [load])

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const body = {
        gemini_model: geminiModel,
        gemini_image_model: geminiImageModel,
        clear_gemini_api_key: clearKey,
      }
      if (geminiApiKey.trim()) {
        body.gemini_api_key = geminiApiKey.trim()
      }
      const res = await api.put('/admin/settings/ai', body)
      setSettings(res.data.settings)
      setGeminiApiKey('')
      setClearKey(false)
      setMessage('AI credentials saved. Chat will use these settings immediately.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="max-w-xl rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
      <h2 className="mb-1 text-lg font-medium text-white">Gemini credentials</h2>
      <p className="mb-6 text-sm text-slate-400">
        Database values override <code className="text-slate-300">.env</code>. Leave API key blank to keep the
        current key.
      </p>

      {settings && (
        <p className="mb-4 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
          Current key: {settings.gemini_api_key_configured ? settings.gemini_api_key_masked : 'Not set'} (
          {settings.gemini_api_key_source})
        </p>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">Gemini API key</label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="Paste new key to replace"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={clearKey} onChange={(e) => setClearKey(e.target.checked)} />
          Remove database key (fall back to .env)
        </label>
        <Field label="Chat model" value={geminiModel} onChange={setGeminiModel} />
        <Field label="Image model" value={geminiImageModel} onChange={setGeminiImageModel} />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save credentials'}
        </button>
      </form>
    </section>
  )
}

function AccountSection({ user, refreshUser }) {
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setName(user?.name || '')
    setEmail(user?.email || '')
  }, [user])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const body = { name, email }
      if (password) {
        body.password = password
        body.password_confirmation = passwordConfirmation
        body.current_password = currentPassword
      }
      await api.patch('/admin/account', body)
      await refreshUser()
      setCurrentPassword('')
      setPassword('')
      setPasswordConfirmation('')
      setMessage('Account updated.')
    } catch (err) {
      const msg =
        err.response?.data?.errors?.current_password?.[0] ||
        err.response?.data?.message ||
        'Update failed.'
      setError(msg)
    }
  }

  return (
    <section className="max-w-md rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
      <h2 className="mb-4 text-lg font-medium text-white">Admin account</h2>
      {message && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      <form onSubmit={save} className="space-y-3">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <hr className="border-slate-700" />
        <p className="text-xs text-slate-500">Change password (optional)</p>
        <Field
          label="Current password"
          type="password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <Field label="New password" type="password" value={password} onChange={setPassword} />
        <Field
          label="Confirm new password"
          type="password"
          value={passwordConfirmation}
          onChange={setPasswordConfirmation}
        />
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Save account
        </button>
      </form>
    </section>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-slate-300">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  )
}

function emptyUserForm() {
  return {
    name: '',
    email: '',
    password: '',
    is_admin: false,
    is_subscribed: false,
    subscribed_plan: '',
  }
}
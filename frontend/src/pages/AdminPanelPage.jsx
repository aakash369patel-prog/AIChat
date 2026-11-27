import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import ThemeToggle from '../components/ThemeToggle'
import { BrandLockup } from '../components/BrandLogo'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'activity', label: 'User activity' },
  { id: 'ai', label: 'AI credentials' },
  { id: 'account', label: 'My account' },
]

const inputClass = 'chat-field'

export default function AdminPanelPage() {
  const { user, refreshUser } = useAuth()
  const [tab, setTab] = useState('users')

  return (
    <div className="min-h-full bg-[var(--chat-bg)] text-[var(--chat-text)]">
      <header className="border-b border-[var(--chat-border)] bg-[var(--chat-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <BrandLockup size="md" />
            <div className="hidden h-8 w-px bg-[var(--chat-border)] sm:block" aria-hidden />
            <div>
              <h1 className="text-xl font-semibold text-white">Admin panel</h1>
              <p className="text-sm text-slate-400">
                Manage users, activity, subscriptions, and AI credentials
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle compact />
            <Link
              to="/"
              className="rounded-lg border border-[var(--chat-border)] px-4 py-2 text-sm text-[var(--chat-text-muted)] transition hover:border-violet-500/40 hover:text-[var(--chat-text)]"
            >
              Back to chat
            </Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:bg-[var(--chat-surface-elevated)] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === 'users' && <UsersSection />}
        {tab === 'activity' && <UserActivitySection />}
        {tab === 'ai' && <AiSettingsSection />}
        {tab === 'account' && <AccountSection user={user} refreshUser={refreshUser} />}
      </main>
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

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
      is_active: u.is_active !== false,
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
        is_active: form.is_active,
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

  const toggleActive = async (u) => {
    const nextActive = u.is_active === false
    const action = nextActive ? 'activate' : 'deactivate'
    setError('')
    setTogglingId(u.id)
    try {
      await api.patch(`/admin/users/${u.id}`, { is_active: nextActive })
      await load(search.trim())
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} user.`)
    } finally {
      setTogglingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setError('')
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`)
      setDeleteTarget(null)
      await load(search.trim())
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed.')
    } finally {
      setDeleteBusy(false)
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
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
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
                  <th className="pb-2 pr-3 font-medium">Status</th>
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
                    <td className="py-3 pr-3">
                      <span
                        className={
                          u.is_active !== false
                            ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300'
                            : 'rounded-full bg-slate-600/40 px-2 py-0.5 text-xs font-medium text-slate-400'
                        }
                      >
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-0.5">
                        <AdminIconButton
                          label={u.is_active !== false ? 'Deactivate user' : 'Activate user'}
                          disabled={togglingId === u.id}
                          onClick={() => toggleActive(u)}
                          className={
                            u.is_active !== false
                              ? 'text-amber-400 hover:bg-amber-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }
                        >
                          {u.is_active !== false ? (
                            <BanIcon className="h-4 w-4" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4" />
                          )}
                        </AdminIconButton>
                        <AdminIconButton
                          label="Edit user"
                          onClick={() => startEdit(u)}
                          className="text-violet-400 hover:bg-violet-500/10"
                        >
                          <EditIcon className="h-4 w-4" />
                        </AdminIconButton>
                        <AdminIconButton
                          label="Delete user"
                          onClick={() => setDeleteTarget(u)}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </AdminIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="mt-4 text-slate-500">No users found.</p>}
          </div>
        )}

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete user?"
          message={
            deleteTarget
              ? `Remove ${deleteTarget.name} (${deleteTarget.email})? This cannot be undone.`
              : ''
          }
          confirmLabel="Delete"
          danger
          busy={deleteBusy}
          onCancel={() => !deleteBusy && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
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
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Account active
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
              className="flex-1 rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500"
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

function UserActivitySection() {
  const [summary, setSummary] = useState(null)
  const [users, setUsers] = useState([])
  const [recent, setRecent] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (q = '') => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/user-activity', { params: q ? { search: q } : {} })
      setSummary(res.data.summary ?? null)
      setUsers(res.data.users?.data ?? [])
      setRecent(res.data.recent ?? [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load user activity.')
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

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={summary.total_users} />
          <StatCard label="Active (7 days)" value={summary.active_last_7_days} />
          <StatCard label="Prompts today" value={summary.prompts_today} />
          <StatCard label="Total prompts" value={summary.total_prompts} />
        </div>
      )}

      <section className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
        <h2 className="mb-1 text-lg font-medium text-white">Per-user activity</h2>
        <p className="mb-4 text-sm text-slate-400">
          Conversations, prompts sent, and last activity derived from chat and API token usage.
        </p>

        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email"
            className={inputClass}
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Search
          </button>
        </form>

        {loading ? (
          <p className="text-slate-400">Loading activity…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="pb-2 pr-3 font-medium">User</th>
                  <th className="pb-2 pr-3 font-medium">Chats</th>
                  <th className="pb-2 pr-3 font-medium">Prompts</th>
                  <th className="pb-2 pr-3 font-medium">Plan</th>
                  <th className="pb-2 pr-3 font-medium">Last active</th>
                  <th className="pb-2 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/80">
                    <td className="py-3 pr-3">
                      <div>
                        <p className="font-medium text-white">{u.name}</p>
                        <p className="text-slate-400">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-3">{u.conversations_count ?? 0}</td>
                    <td className="py-3 pr-3">{u.prompts_sent ?? 0}</td>
                    <td className="py-3 pr-3">
                      {u.is_subscribed ? u.subscribed_plan || 'subscribed' : 'Free'}
                    </td>
                    <td className="py-3 pr-3 text-slate-300">{formatAdminDate(u.last_active_at)}</td>
                    <td className="py-3 text-slate-400">{formatAdminDate(u.registered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="mt-4 text-slate-500">No users match your search.</p>}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
        <h2 className="mb-1 text-lg font-medium text-white">Recent prompts</h2>
        <p className="mb-4 text-sm text-slate-400">Latest user messages across all conversations.</p>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="text-slate-500">No prompts yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {recent.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-white">
                    {item.user?.name ?? 'Unknown user'}
                    <span className="ml-2 text-xs font-normal text-slate-500">{item.user?.email}</span>
                  </p>
                  <time className="text-xs text-slate-500">{formatAdminDate(item.created_at)}</time>
                </div>
                <p className="mt-1 text-sm text-slate-300">{item.preview}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.conversation?.title || 'Chat'} · {item.content_type || 'text'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value ?? '—'}</p>
    </div>
  )
}

function formatAdminDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return '—'
  }
}

function AiSettingsSection() {
  const [settings, setSettings] = useState(null)
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('')
  const [geminiImageModel, setGeminiImageModel] = useState('')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [openaiModel, setOpenaiModel] = useState('')
  const [openaiImageModel, setOpenaiImageModel] = useState('')
  const [clearKey, setClearKey] = useState(false)
  const [clearOpenaiKey, setClearOpenaiKey] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const res = await api.get('/admin/settings/ai')
    const s = res.data.settings
    setSettings(s)
    setGeminiModel(s.gemini_model || '')
    setGeminiImageModel(s.gemini_image_model || '')
    setOpenaiModel(s.openai_model || '')
    setOpenaiImageModel(s.openai_image_model || '')
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
        openai_model: openaiModel,
        openai_image_model: openaiImageModel,
        clear_gemini_api_key: clearKey,
        clear_openai_api_key: clearOpenaiKey,
      }
      if (geminiApiKey.trim()) {
        body.gemini_api_key = geminiApiKey.trim()
      }
      if (openaiApiKey.trim()) {
        body.openai_api_key = openaiApiKey.trim()
      }
      const res = await api.put('/admin/settings/ai', body)
      setSettings(res.data.settings)
      setGeminiApiKey('')
      setOpenaiApiKey('')
      setClearKey(false)
      setClearOpenaiKey(false)
      setMessage('AI credentials saved. Chat will use these settings immediately.')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="max-w-xl rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
      <h2 className="mb-1 text-lg font-medium text-white">AI credentials</h2>
      <p className="mb-6 text-sm text-slate-400">
        Gemini is used first. If the key is missing, quota is exhausted, or the request fails with auth or rate
        limits, chat automatically falls back to OpenAI when a backup key is set. Database values override{' '}
        <code className="text-slate-300">.env</code>. Leave API keys blank to keep the current keys.
      </p>

      {settings && (
        <p className="mb-4 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
          Current key: {settings.gemini_api_key_configured ? settings.gemini_api_key_masked : 'Not set'} (
          {settings.gemini_api_key_source})
        </p>
      )}

      {message && (
        <div className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-200">
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
        <Field label="Gemini chat model" value={geminiModel} onChange={setGeminiModel} />
        <Field label="Gemini image model" value={geminiImageModel} onChange={setGeminiImageModel} />

        <div className="border-t border-slate-700 pt-4">
          <h3 className="mb-3 text-sm font-medium text-violet-200">OpenAI backup</h3>
          {settings && (
            <p className="mb-3 text-sm text-slate-300">
              Backup key:{' '}
              {settings.openai_api_key_configured ? settings.openai_api_key_masked : 'Not set'} (
              {settings.openai_api_key_source})
              {settings.openai_backup_enabled ? ' — auto-fallback enabled' : ''}
            </p>
          )}
          <div className="mb-3">
            <label className="mb-1 block text-sm text-slate-300">OpenAI API key</label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-… (backup when Gemini fails)"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={clearOpenaiKey} onChange={(e) => setClearOpenaiKey(e.target.checked)} />
            Remove database OpenAI key (fall back to .env)
          </label>
          <Field label="OpenAI chat model" value={openaiModel} onChange={setOpenaiModel} />
          <Field label="OpenAI image model" value={openaiImageModel} onChange={setOpenaiImageModel} />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
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
        <div className="mb-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-200">
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
          className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-violet-500"
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
    is_active: true,
    is_subscribed: false,
    subscribed_plan: '',
  }
}

function AdminIconButton({ label, onClick, children, className = '', disabled = false }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

function EditIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-3.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
    </svg>
  )
}

function TrashIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  )
}

function BanIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  )
}

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}
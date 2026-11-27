import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import { BrandLockup } from '../components/BrandLogo'
import { brand } from '../brand'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(name, email, password, passwordConfirmation)
      navigate('/')
    } catch (err) {
      const errors = err.response?.data?.errors
      const firstError = errors && Object.values(errors).flat()[0]
      setError(firstError || err.response?.data?.message || 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-full items-center justify-center bg-[var(--chat-bg)] px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] p-8"
        style={{ boxShadow: 'var(--chat-card-shadow)' }}
      >
        <div className="mb-6">
          <BrandLockup size="lg" layout="stacked" showTagline className="mb-2" />
          <h1 className="text-xl font-semibold text-[var(--chat-text)]">Create account</h1>
          <p className="mt-1 text-sm text-[var(--chat-text-muted)]">Join {brand.name}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-[var(--chat-text-muted)]">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="chat-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--chat-text-muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="chat-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--chat-text-muted)]">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="chat-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--chat-text-muted)]">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="chat-field"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-violet-600 py-2.5 font-medium text-white transition hover:bg-violet-500 disabled:opacity-60"
          >
            {submitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--chat-text-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-400 hover:text-violet-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
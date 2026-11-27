import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({ className = '', compact = false }) {
  const { theme, setTheme } = useTheme()

  const base =
    'inline-flex items-center rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface-elevated)] p-0.5 text-[var(--chat-text-muted)]'
  const btn = (active) =>
    `rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
      active
        ? 'bg-[var(--chat-surface)] text-[var(--chat-text)] shadow-sm'
        : 'hover:text-[var(--chat-text)]'
    }`

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={`rounded-lg p-2 text-[var(--chat-text-muted)] transition hover:bg-[var(--chat-surface-elevated)] hover:text-[var(--chat-text)] ${className}`}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
      </button>
    )
  }

  return (
    <div className={`${base} ${className}`} role="group" aria-label="Theme">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={btn(theme === 'light')}
        aria-pressed={theme === 'light'}
      >
        <span className="flex items-center gap-1.5">
          <SunIcon className="h-3.5 w-3.5" />
          {!compact && 'Light'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={btn(theme === 'dark')}
        aria-pressed={theme === 'dark'}
      >
        <span className="flex items-center gap-1.5">
          <MoonIcon className="h-3.5 w-3.5" />
          {!compact && 'Dark'}
        </span>
      </button>
    </div>
  )
}

function SunIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
      />
    </svg>
  )
}
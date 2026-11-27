import { brand } from '../brand'

const markSizes = {
  xs: { box: 'h-7 w-7 rounded-md', icon: 'h-3.5 w-3.5' },
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-14 w-14 rounded-2xl', icon: 'h-7 w-7' },
}

const titleSizes = {
  sm: 'text-sm font-semibold tracking-tight',
  md: 'text-base font-semibold tracking-tight',
  lg: 'text-2xl font-semibold tracking-tight',
}

/** AI chat bubble + neural nodes mark */
export function AppLogoIcon({ className, decorative = false, title = brand.name }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': title })}
    >
      <path
        d="M6 5.5A3.5 3.5 0 0 1 9.5 2h7A3.5 3.5 0 0 1 20 5.5v5.75A3.5 3.5 0 0 1 16.5 14.75h-3.9L9 17.25v-2.5H9.5A3.5 3.5 0 0 1 6 11.25V5.5Z"
        fill="currentColor"
        opacity="0.22"
      />
      <path
        d="M8.25 8.5h7.5M8.25 11h4.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.85"
      />
      <circle cx="8.75" cy="6.75" r="1.15" fill="currentColor" />
      <circle cx="12" cy="6.75" r="1.15" fill="currentColor" opacity="0.75" />
      <circle cx="15.25" cy="6.75" r="1.15" fill="currentColor" opacity="0.55" />
      <path d="M8.75 7.9l3.25 1.15M15.25 7.9l-3.25 1.15" stroke="currentColor" strokeWidth="0.9" opacity="0.7" />
      <path
        d="M17.25 3.5l.45 1.2 1.2.45-1.2.45-.45 1.2-.45-1.2-1.2-.45 1.2-.45.45-1.2Z"
        fill="currentColor"
        opacity="0.95"
      />
    </svg>
  )
}

export function BrandMark({ size = 'sm', className = '', ...rest }) {
  const s = markSizes[size] ?? markSizes.sm
  return (
    <div
      className={`brand-icon-wrap flex shrink-0 items-center justify-center text-violet-400 ${s.box} ${className}`}
      aria-hidden
      {...rest}
    >
      <AppLogoIcon className={s.icon} decorative />
    </div>
  )
}

export function BrandWordmark({ size = 'sm', className = '' }) {
  const textClass = titleSizes[size] ?? titleSizes.sm
  return (
    <span className={`${textClass} text-[var(--chat-text)] ${className}`}>
      AI{' '}
      <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
        Chat Board
      </span>
    </span>
  )
}

/**
 * Logo + product name. Use in sidebars, auth cards, and page headers.
 * @param {'horizontal'|'stacked'} layout
 */
export function BrandLockup({
  size = 'sm',
  layout = 'horizontal',
  showTagline = false,
  className = '',
}) {
  const stacked = layout === 'stacked'
  return (
    <div
      className={`flex min-w-0 ${stacked ? 'flex-col items-center text-center' : 'items-center gap-2'} ${className}`}
    >
      <BrandMark size={size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'} />
      <div className={stacked ? 'mt-3' : 'min-w-0'}>
        <BrandWordmark size={size === 'lg' ? 'lg' : size === 'md' ? 'md' : 'sm'} className="truncate" />
        {showTagline && (
          <p className="mt-0.5 truncate text-xs text-[var(--chat-text-muted)]">{brand.tagline}</p>
        )}
      </div>
    </div>
  )
}
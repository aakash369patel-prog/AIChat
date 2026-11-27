import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  user,
  onLogout,
  isGuest,
  open,
  onClose,
  chatSearch,
  onChatSearchChange,
  onChatSearchSubmit,
  searchLoading,
  streakDays,
}) {
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const startRename = (conversation) => {
    setEditingId(conversation.id)
    setEditTitle(conversation.title)
  }

  const submitRename = (id) => {
    const title = editTitle.trim()
    if (title) {
      onRename(id, title)
    }
    setEditingId(null)
  }

  const handleSelect = (id) => {
    onSelect(id)
    onClose?.()
  }

  const handleNewChat = () => {
    onNewChat()
    onClose?.()
  }

  const initial = user?.name?.trim()?.[0]?.toUpperCase() || '?'

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] shrink-0 flex-col border-r border-[var(--chat-border-subtle)] bg-[var(--chat-surface)] transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-[var(--chat-border-subtle)] px-3 py-3">
          <BrandMark />
          <span className="truncate text-sm font-semibold tracking-tight text-[var(--chat-text)]">
            AI Chat
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-2 text-[var(--chat-text-muted)] hover:bg-[var(--chat-surface-elevated)] md:hidden"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface-elevated)] px-3 py-2.5 text-sm font-medium text-[var(--chat-text)] transition hover:border-emerald-500/50 hover:bg-[#1a2420]"
          >
            <PlusIcon className="h-4 w-4 text-emerald-400" />
            New chat
          </button>
        </div>

        {!isGuest && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onChatSearchSubmit?.()
            }}
            className="px-3 pb-2"
          >
            <input
              type="search"
              value={chatSearch}
              onChange={(e) => onChatSearchChange?.(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-xl border border-[var(--chat-border)] bg-[var(--chat-bg)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--chat-text-muted)] focus:border-emerald-500/50"
            />
            {searchLoading && (
              <p className="mt-1 px-1 text-[10px] text-[var(--chat-text-muted)]">Searching…</p>
            )}
          </form>
        )}

        <SectionLabel label="Chats" />

        <div className="chat-scroll flex-1 overflow-y-auto px-2 pb-2">
          {conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-xs leading-relaxed text-[var(--chat-text-muted)]">
              {isGuest ? 'Sign in to save and sync your conversations' : 'Start a new chat to begin'}
            </p>
          )}
          <ul className="space-y-0.5">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                {editingId === conversation.id ? (
                  <div className="rounded-xl bg-[var(--chat-surface-elevated)] p-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(conversation.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="mb-2 w-full rounded-lg border border-[var(--chat-border)] bg-[var(--chat-bg)] px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <RemoteSaveCancel
                      onSave={() => submitRename(conversation.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <ConversationRow
                    active={conversation.id === activeId}
                    conversation={conversation}
                    onSelect={() => handleSelect(conversation.id)}
                    onRename={() => startRename(conversation)}
                    onDelete={() => onDelete(conversation.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-[var(--chat-border-subtle)] p-3">
          {isGuest ? (
            <div className="space-y-2">
              <p className="px-1 text-[11px] uppercase tracking-wide text-[var(--chat-text-muted)]">
                Guest mode
              </p>
              <Link
                to="/login"
                state={{ from: '/' }}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-medium text-white transition hover:bg-emerald-500"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="flex w-full items-center justify-center rounded-xl border border-[var(--chat-border)] py-2.5 text-center text-sm text-[var(--chat-text-muted)] transition hover:bg-[var(--chat-surface-elevated)] hover:text-white"
              >
                Create account
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-xl px-2 py-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-semibold text-white">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--chat-text)]">{user?.name}</p>
                  <p className="truncate text-xs text-[var(--chat-text-muted)]">
                    {user?.email}
                    {streakDays > 0 ? ` · 🔥 ${streakDays}d streak` : ''}
                  </p>
                </div>
              </div>
              <Link
                to="/usage"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--chat-border)] py-2 text-xs font-medium text-[var(--chat-text-muted)] transition hover:border-emerald-500/40 hover:text-emerald-300"
              >
                Usage dashboard
              </Link>
              <Link
                to="/plans"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--chat-border)] py-2 text-xs font-medium text-[var(--chat-text-muted)] transition hover:border-emerald-500/40 hover:text-emerald-300"
              >
                Upgrade plan
              </Link>
              {user?.is_admin && (
                <Link
                  to="/admin"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 py-2 text-xs font-medium text-amber-200/90 transition hover:border-amber-400/50 hover:bg-amber-500/10"
                >
                  Admin panel
                </Link>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="w-full rounded-xl py-2 text-sm text-[var(--chat-text-muted)] transition hover:bg-[var(--chat-surface-elevated)] hover:text-white"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 px-4 pb-1 pt-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--chat-text-muted)]">
        {label}
      </span>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 ring-1 ring-emerald-500/30">
      <AppIcon className="h-4 w-4 text-emerald-400" />
    </div>
  )
}

function AppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M18 14L18.75 17L21.5 17.75L18.75 18.5L18 21.5L17.25 18.5L14.5 17.75L17.25 17L18 14Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  )
}

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

function CloseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function RemoteSaveCancel({ onSave, onCancel }) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onSave}
        className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-medium text-white"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded-lg bg-zinc-700 py-1.5 text-xs text-zinc-200"
      >
        Cancel
      </button>
    </div>
  )
}

function ConversationRow({ active, conversation, onSelect, onRename, onDelete }) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-xl px-2 py-1.5 transition-colors ${
        active
          ? 'bg-[var(--chat-surface-elevated)] text-[var(--chat-text)]'
          : 'text-[var(--chat-text-muted)] hover:bg-[var(--chat-surface-elevated)]/70 hover:text-[var(--chat-text)]'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-2 py-1 text-left text-sm"
      >
        <ChatBubbleIcon className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
        <span className="line-clamp-2 leading-snug">{conversation.title}</span>
      </button>
      <ConversationActions onRename={onRename} onDelete={onDelete} />
    </div>
  )
}

function ChatBubbleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 9.75h6.75M8.625 12.75h4.125M21 12c0 4.556-4.03 8.25-9 8.25a9.77 9.77 0 01-4.125-.9L3 21l.975-4.275A8.214 8.214 0 013 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  )
}

function ConversationActions({ onRename, onDelete }) {
  return (
    <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
      <IconButton label="Rename" onClick={onRename}>
        <EditIcon className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton label="Delete" onClick={onDelete} danger>
        <TrashIcon className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  )
}

function IconButton({ label, onClick, children, danger }) {
  return (
    <button
      type="button"
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`rounded-lg p-1.5 transition ${
        danger
          ? 'text-red-400 hover:bg-red-500/10'
          : 'text-[var(--chat-text-muted)] hover:bg-zinc-700/80 hover:text-white'
      }`}
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
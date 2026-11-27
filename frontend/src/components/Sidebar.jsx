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

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 p-4">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-white transition hover:border-emerald-600 hover:bg-slate-800"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-slate-500">
            {isGuest
              ? 'Sign in to save chat history'
              : 'No conversations yet'}
          </p>
        )}
        <ul className="space-y-1">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              {editingId === conversation.id ? (
                <div className="rounded-lg bg-slate-900 p-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename(conversation.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="mb-2 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-white"
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
                  onSelect={onSelect}
                  onRename={() => startRename(conversation)}
                  onDelete={() => onDelete(conversation.id)}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-800 p-4">
        {isGuest ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">You are browsing as a guest</p>
            <Link
              to="/login"
              state={{ from: '/' }}
              className="block w-full rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white hover:bg-emerald-500"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="block w-full rounded-lg border border-slate-700 py-2 text-center text-sm text-slate-300 hover:bg-slate-800"
            >
              Register
            </Link>
          </div>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
            <button
              type="button"
              onClick={onLogout}
              className="mt-3 w-full rounded-lg bg-slate-800 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </aside>
  )
}

function RemoteSaveCancel({ onSave, onCancel }) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={onSave}
        className="flex-1 rounded bg-emerald-600 py-1 text-xs text-white"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 rounded bg-slate-700 py-1 text-xs text-slate-200"
      >
        Cancel
      </button>
    </div>
  )
}

function ConversationRow({ active, conversation, onSelect, onRename, onDelete }) {
  return (
    <div
      className={`group flex items-start gap-1 rounded-lg px-2 py-2 ${
        active ? 'bg-slate-800' : 'hover:bg-slate-900'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className="min-w-0 flex-1 text-left text-sm text-slate-200"
      >
        <span className="line-clamp-2">{conversation.title}</span>
      </button>
      <ConversationActions onRename={onRename} onDelete={onDelete} />
    </div>
  )
}

function ConversationActions({ onRename, onDelete }) {
  return (
    <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
      <IconButton label="Rename" onClick={onRename} symbol="✎" />
      <IconButton label="Delete" onClick={onDelete} symbol="×" danger />
    </div>
  )
}

function IconButton({ label, onClick, symbol, danger }) {
  return (
    <button
      type="button"
      title={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`rounded px-1.5 text-xs ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:bg-slate-700'
      }`}
    >
      {symbol}
    </button>
  )
}
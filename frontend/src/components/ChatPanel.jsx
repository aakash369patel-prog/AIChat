import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const SUGGESTIONS = [
  'Explain quantum computing in simple terms',
  'Help me write a professional email',
  'Give me 5 creative dinner ideas',
  'Debug this code step by step',
]

export default function ChatPanel({
  messages,
  loading,
  sending,
  error,
  onSend,
  conversationTitle,
  usage,
  onUpgradeClick,
  guestMode,
  mode,
  onModeChange,
}) {
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [attachmentPreview, setAttachmentPreview] = useState(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    if (usage?.allows_image === false && mode === 'image') {
      onModeChange?.('chat')
    }
  }, [usage?.allows_image, mode, onModeChange])

  const clearAttachment = () => {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview)
    }
    setAttachment(null)
    setAttachmentPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview)
    }

    setAttachment(file)
    if (file.type.startsWith('image/')) {
      setAttachmentPreview(URL.createObjectURL(file))
    } else {
      setAttachmentPreview(null)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if ((!text && !attachment) || sending) return
    if (!guestMode) {
      setInput('')
    }
    onSend(text, mode, attachment)
    clearAttachment()
  }

  const isImageMode = mode === 'image'
  const canSubmit = Boolean(input.trim() || attachment)

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/50 px-6 py-4 backdrop-blur-sm">
        <h2 className="truncate text-lg font-semibold tracking-tight text-white">
          {conversationTitle || 'Select or start a chat'}
        </h2>
        {usage && usage.prompts_limit != null && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              {usage.is_subscribed ? 'Chat prompts' : 'Free prompts'}: {usage.prompts_used} /{' '}
              {usage.prompts_limit}
            </span>
            {usage.credit_limit_reached ? (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="rounded-md bg-amber-600/20 px-2 py-1 text-amber-300 hover:bg-amber-600/30"
              >
                Upgrade
              </button>
            ) : null}
          </div>
        )}
        {usage?.is_unlimited && (
          <span className="rounded-md bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300">
            {usage.plan_name || 'Pro'} · Unlimited
          </span>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {loading && (
          <div className="flex justify-center py-12">
            <ThinkingDots label="Loading messages" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-8 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 ring-1 ring-emerald-500/30">
              <GeminiIcon className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white">How can I help you today?</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              {guestMode
                ? 'Type a message and send — you will be asked to sign in first.'
                : 'Ask anything — explanations, writing, code, ideas, and more.'}
            </p>
            {!isImageMode && (
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => setInput(text)}
                    className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-800/80 hover:text-white"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-8">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {sending && (
            <div className="flex items-start gap-3">
              <AssistantAvatar />
              <div className="rounded-2xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 shadow-lg shadow-black/20">
                <ThinkingDots label={isImageMode ? 'Generating image' : 'Gemini is thinking'} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300 md:mx-8">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800/80 bg-slate-900/80 p-4 backdrop-blur-md md:p-6"
      >
        <div className="mx-auto mb-3 flex max-w-3xl gap-2">
          <ModeToggle
            mode={mode}
            onChange={onModeChange}
            disabled={sending}
            allowsImage={usage?.allows_image !== false}
          />
        </div>
        {attachment && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
            {attachmentPreview ? (
              <img
                src={attachmentPreview}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-800 text-lg">
                📎
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
            <button
              type="button"
              onClick={clearAttachment}
              className="text-slate-400 hover:text-white"
              aria-label="Remove attachment"
            >
              ✕
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={isImageMode ? 'image/*' : 'image/*,application/pdf'}
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={!guestMode && (sending || usage?.credit_limit_reached)}
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 text-slate-300 transition hover:border-emerald-500 hover:text-white disabled:opacity-50"
            title="Attach file"
            aria-label="Attach file"
          >
            📎
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder={
              isImageMode ? 'Describe the image you want to create...' : 'Message Gemini...'
            }
            disabled={!guestMode && (sending || usage?.credit_limit_reached)}
            className="max-h-40 min-h-[44px] flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={(!guestMode && (sending || usage?.credit_limit_reached)) || !canSubmit}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 font-medium text-white shadow-lg shadow-emerald-900/30 transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
          >
            {isImageMode ? 'Create' : 'Send'}
          </button>
        </div>
      </form>
    </main>
  )
}

function ModeToggle({ mode, onChange, disabled, allowsImage }) {
  const options = [{ id: 'chat', label: 'Chat' }]
  if (allowsImage) {
    options.push({ id: 'image', label: 'Create image' })
  }

  return (
    <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-1 text-xs">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(opt.id)}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors disabled:opacity-50 ${
            mode === opt.id
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function AssistantAvatar() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-600/25 ring-1 ring-emerald-500/40"
      aria-hidden
    >
      <GeminiIcon className="h-5 w-5 text-emerald-400" />
    </div>
  )
}

function UserAvatar() {
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-semibold text-white shadow-md shadow-emerald-900/40"
      aria-hidden
    >
      You
    </div>
  )
}

function GeminiIcon({ className }) {
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

function ThinkingDots({ label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-emerald-300/90">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-emerald-400"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span>{label}…</span>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const isImage = !isUser && message.content_type === 'image' && message.image_url
  const [copied, setCopied] = useState(false)

  const textContent =
    message.content && message.content !== '[Attachment]'
      ? message.content
      : message.content === '[Attachment]' && !message.attachment_url
        ? message.content
        : null

  const handleCopy = async () => {
    if (!textContent) return
    try {
      await navigator.clipboard.writeText(textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="group max-w-[min(85%,42rem)]">
          <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3 text-sm leading-relaxed text-white shadow-lg shadow-emerald-950/30">
            {message.attachment_url && (
              <div className="mb-2">
                {message.attachment_mime?.startsWith('image/') ? (
                  <img
                    src={message.attachment_url}
                    alt="Attached"
                    className="max-h-48 rounded-lg object-contain ring-1 ring-white/20"
                  />
                ) : (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-emerald-100"
                  >
                    View attachment
                  </a>
                )}
              </div>
            )}
            {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
          </div>
        </div>
        <UserAvatar />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <AssistantAvatar />
      <div className="group relative min-w-0 max-w-[min(85%,42rem)] flex-1">
        <div className="rounded-2xl rounded-bl-md border border-slate-700/50 bg-slate-800/60 px-4 py-3 shadow-lg shadow-black/25 backdrop-blur-sm">
          {isImage ? (
            <ImageMessageContent message={message} />
          ) : (
            <>
              {message.attachment_url && (
                <AttachmentBlock message={message} />
              )}
              {textContent && (
                <div className="chat-prose text-sm text-slate-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
                </div>
              )}
            </>
          )}
        </div>
        {!isImage && textContent && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute -right-1 top-0 rounded-lg border border-slate-700 bg-slate-900/90 px-2 py-1 text-xs text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-white focus:opacity-100"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}

function ImageMessageContent({ message }) {
  return (
    <div className="space-y-2">
      <img
        src={message.image_url}
        alt={message.content || 'Generated image'}
        className="max-h-96 w-full rounded-xl object-contain ring-1 ring-slate-600/50"
      />
      {message.content && message.content !== '[Attachment]' && (
        <p className="text-xs text-slate-400">{message.content}</p>
      )}
    </div>
  )
}

function AttachmentBlock({ message }) {
  return (
    <div className="mb-3">
      {message.attachment_mime?.startsWith('image/') ? (
        <img
          src={message.attachment_url}
          alt="Attached"
          className="max-h-48 rounded-lg object-contain ring-1 ring-slate-600/50"
        />
      ) : (
        <a
          href={message.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 underline hover:text-emerald-300"
        >
          View attachment
        </a>
      )}
    </div>
  )
}
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { applySlashCommand, slashSuggestion } from '../utils/slashCommands'
import { downloadShareCard, shareReplyNative } from '../utils/shareCard'
import {
  createSpeechRecognizer,
  speakText,
  speechRecognitionAvailable,
  stopSpeaking,
} from '../utils/voice'

const SUGGESTIONS = [
  '/eli5 how blockchain works',
  '/caption my weekend hiking photo idea',
  '/code a Python password strength checker',
  '/tldr climate change basics',
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
  onOpenSidebar,
  onRegenerate,
  onEditMessage,
  personas = [],
  slashCommands = [],
  personaId,
  onPersonaChange,
}) {
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [attachmentPreview, setAttachmentPreview] = useState(null)
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const recognizerRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  useEffect(() => {
    if (usage?.allows_image === false && mode === 'image') {
      onModeChange?.('chat')
    }
  }, [usage?.allows_image, mode, onModeChange])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

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

    const slash = applySlashCommand(text, slashCommands)
    if (slash.needsMore) {
      setVoiceError(`Add your prompt after ${slash.command?.command || 'the command'}.`)
      return
    }

    const outbound = slash.content?.trim() || text
    if (!guestMode) {
      setInput('')
    }
    setVoiceError('')
    onSend(outbound, mode, attachment)
    clearAttachment()
  }

  const toggleListen = () => {
    setVoiceError('')
    if (listening) {
      recognizerRef.current?.stop?.()
      setListening(false)
      return
    }

    const recognition = createSpeechRecognizer({
      onResult: (transcript, isFinal) => {
        if (transcript) setInput(transcript)
        if (isFinal) setListening(false)
      },
      onError: (code) => {
        setVoiceError(code === 'not-allowed' ? 'Microphone permission denied.' : 'Voice input failed.')
        setListening(false)
      },
      onEnd: () => setListening(false),
    })

    if (!recognition) {
      setVoiceError('Voice input is not supported in this browser.')
      return
    }

    recognizerRef.current = recognition
    setListening(true)
    recognition.start()
  }

  const slashHint = slashSuggestion(input, slashCommands)

  const isImageMode = mode === 'image'
  const canSubmit = Boolean(input.trim() || attachment)
  const inputDisabled = !guestMode && (sending || usage?.credit_limit_reached)

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[var(--chat-bg)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--chat-border-subtle)] bg-[var(--chat-bg)]/90 px-3 py-3 backdrop-blur-md md:px-5">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-lg p-2 text-[var(--chat-text-muted)] transition hover:bg-[var(--chat-surface-elevated)] hover:text-white md:hidden"
          aria-label="Open sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--chat-text)] md:text-base">
          {conversationTitle || 'New conversation'}
        </h2>
        {usage && usage.prompts_limit != null && !usage.is_unlimited && (
          <UsagePill usage={usage} onUpgradeClick={onUpgradeClick} />
        )}
        {usage?.is_unlimited && (
          <span className="hidden rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 sm:inline">
            {usage.plan_name || 'Pro'} · Unlimited
          </span>
        )}
        {usage?.streak?.current_streak_days > 0 && (
          <span className="rounded-full bg-orange-500/15 px-2 py-1 text-[11px] font-medium text-orange-200">
            🔥 {usage.streak.current_streak_days}d
          </span>
        )}
      </header>

      <div className="chat-scroll flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-16">
            <ThinkingDots label="Loading messages" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <EmptyState
            guestMode={guestMode}
            isImageMode={isImageMode}
            onPickSuggestion={setInput}
          />
        )}

        {messages.length > 0 && (
          <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
            {(() => {
              const lastAssistantId = [...messages]
                .reverse()
                .find((m) => m.role === 'assistant' && !m.streaming)?.id
              const lastUserId = [...messages]
                .reverse()
                .find((m) => m.role === 'user' && !m.attachment_url)?.id

              return messages.map((message) => (
                <MessageRow
                  key={message.id}
                  message={message}
                  isLastAssistant={message.id === lastAssistantId}
                  isLastUser={message.id === lastUserId}
                onRegenerate={onRegenerate}
                onEditMessage={onEditMessage}
                sending={sending}
                conversationTitle={conversationTitle}
              />
            ))
            })()}

            {sending && !messages.some((m) => m.streaming) && (
              <div className="animate-message-in flex gap-4 py-4">
                <AssistantAvatar />
                <div className="flex min-h-[2.5rem] items-center pt-1">
                  <ThinkingDots label={isImageMode ? 'Generating image' : 'Thinking'} />
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-2" />
          </div>
        )}
      </div>

      <footer className="shrink-0 px-3 pb-4 pt-2 md:px-6 md:pb-6">
        {error && (
          <div className="mx-auto mb-2 max-w-3xl rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          {!guestMode && personas.length > 0 && (
            <PersonaStrip
              personas={personas}
              value={personaId}
              onChange={onPersonaChange}
              disabled={sending}
            />
          )}

          <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
            <ModeToggle
              mode={mode}
              onChange={onModeChange}
              disabled={sending}
              allowsImage={usage?.allows_image !== false}
            />
            {usage?.credit_limit_reached && (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="text-xs font-medium text-amber-400 hover:text-amber-300"
              >
                Upgrade to continue →
              </button>
            )}
          </div>

          {attachment && (
            <AttachmentChip
              attachment={attachment}
              preview={attachmentPreview}
              onClear={clearAttachment}
            />
          )}

          {slashHint && (
            <p className="mb-2 px-2 text-xs text-emerald-300/90">
              {slashHint.command} — {slashHint.label}
            </p>
          )}

          {voiceError && <p className="mb-2 px-2 text-xs text-amber-300/90">{voiceError}</p>}

          <div className="flex items-end gap-1 rounded-[1.75rem] border border-[var(--chat-border)] bg-[var(--chat-surface-elevated)] p-2 shadow-[var(--composer-shadow)] transition focus-within:border-emerald-500/40">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={isImageMode ? 'image/*' : 'image/*,application/pdf'}
              onChange={handleFileChange}
            />
            <button
              type="button"
              disabled={inputDisabled}
              onClick={() => fileInputRef.current?.click()}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--chat-text-muted)] transition hover:bg-zinc-700/60 hover:text-white disabled:opacity-40"
              title="Attach file"
              aria-label="Attach file"
            >
              <PaperclipIcon className="h-5 w-5" />
            </button>
            {speechRecognitionAvailable() && !guestMode && mode !== 'image' && (
              <button
                type="button"
                disabled={inputDisabled}
                onClick={toggleListen}
                className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                  listening
                    ? 'bg-red-500/20 text-red-300'
                    : 'text-[var(--chat-text-muted)] hover:bg-zinc-700/60 hover:text-white'
                }`}
                title={listening ? 'Stop listening' : 'Voice input'}
                aria-label="Voice input"
              >
                <MicIcon className="h-5 w-5" />
              </button>
            )}
            <textarea
              ref={textareaRef}
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
                isImageMode ? 'Describe the image you want…' : 'Send a message…'
              }
              disabled={inputDisabled}
              className="max-h-[200px] min-h-[2.25rem] flex-1 resize-none bg-transparent py-2 pl-1 pr-2 text-[0.9375rem] leading-relaxed text-[var(--chat-text)] outline-none placeholder:text-[var(--chat-text-muted)] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={inputDisabled || !canSubmit}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500"
              aria-label={isImageMode ? 'Create image' : 'Send message'}
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-2 px-2 text-center text-[10px] text-[var(--chat-text-muted)]">
            AI responses can be inaccurate. Verify important information.
          </p>
        </form>
      </footer>
    </main>
  )
}

function UsagePill({ usage, onUpgradeClick }) {
  const atLimit = usage.credit_limit_reached
  return (
    <div className="flex items-center gap-2 text-[11px] text-[var(--chat-text-muted)]">
      <span className="hidden sm:inline">
        {usage.is_subscribed ? 'Prompts' : 'Free'}: {usage.prompts_used}/{usage.prompts_limit}
      </span>
      {atLimit ? (
        <button
          type="button"
          onClick={onUpgradeClick}
          className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-300 hover:bg-amber-500/25"
        >
          Upgrade
        </button>
      ) : (
        <span className="inline-flex h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800 sm:hidden">
          <span
            className="h-full rounded-full bg-emerald-500"
            style={{
              width: `${Math.min(100, (usage.prompts_used / usage.prompts_limit) * 100)}%`,
            }}
          />
        </span>
      )}
    </div>
  )
}

function EmptyState({ guestMode, isImageMode, onPickSuggestion }) {
  return (
    <div className="mx-auto flex min-h-[min(70vh,32rem)] max-w-2xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-600/15 ring-1 ring-emerald-500/25">
        <AppIcon className="h-7 w-7 text-emerald-400" />
      </div>
      <h3 className="text-2xl font-semibold tracking-tight text-[var(--chat-text)]">
        How can I help you today?
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--chat-text-muted)]">
        {guestMode
          ? 'Try the composer below — you’ll be asked to sign in when you send.'
          : 'Ask for explanations, drafts, code, brainstorming, or image ideas.'}
      </p>
      {!isImageMode && (
        <div className="mt-10 grid w-full gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onPickSuggestion(text)}
              className="rounded-2xl border border-[var(--chat-border)] bg-[var(--chat-surface)] px-4 py-3.5 text-left text-sm text-[var(--chat-text-muted)] transition hover:border-emerald-500/35 hover:bg-[var(--chat-surface-elevated)] hover:text-[var(--chat-text)]"
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AttachmentChip({ attachment, preview, onClear }) {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-[var(--chat-border)] bg-[var(--chat-surface)] px-3 py-2 text-xs text-[var(--chat-text-muted)]">
      {preview ? (
        <img src={preview} alt="" className="h-9 w-9 rounded-lg object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800">
          <PaperclipIcon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded-lg p-1 hover:bg-zinc-700 hover:text-white"
        aria-label="Remove attachment"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function ModeToggle({ mode, onChange, disabled, allowsImage }) {
  const options = [{ id: 'chat', label: 'Chat' }]
  if (allowsImage) {
    options.push({ id: 'image', label: 'Create image' })
  }

  return (
    <div className="inline-flex rounded-full border border-[var(--chat-border)] bg-[var(--chat-surface)] p-0.5 text-[11px]">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(opt.id)}
          className={`rounded-full px-3 py-1 font-medium transition disabled:opacity-50 ${
            mode === opt.id
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-[var(--chat-text-muted)] hover:text-[var(--chat-text)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function PersonaStrip({ personas, value, onChange, disabled }) {
  return (
    <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {personas.map((persona) => (
        <button
          key={persona.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange?.(persona.id)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            value === persona.id
              ? 'border-emerald-500/60 bg-emerald-600/20 text-emerald-200'
              : 'border-[var(--chat-border)] bg-[var(--chat-surface)] text-[var(--chat-text-muted)] hover:text-white'
          }`}
        >
          {persona.emoji} {persona.name}
        </button>
      ))}
    </div>
  )
}

function MessageRow({
  message,
  isLastAssistant,
  isLastUser,
  onRegenerate,
  onEditMessage,
  sending,
  conversationTitle,
}) {
  const isUser = message.role === 'user'
  if (isUser) {
    return (
      <UserMessage
        message={message}
        canEdit={isLastUser && !sending}
        onEdit={() => onEditMessage?.(message)}
      />
    )
  }
  return (
    <AssistantMessage
      message={message}
      canRegenerate={isLastAssistant && message.content_type === 'text' && !sending}
      onRegenerate={() => onRegenerate?.(message)}
      conversationTitle={conversationTitle}
    />
  )
}

function UserMessage({ message, canEdit, onEdit }) {
  const textContent =
    message.content && message.content !== '[Attachment]'
      ? message.content
      : message.content === '[Attachment]' && !message.attachment_url
        ? message.content
        : null

  return (
    <div className="animate-message-in flex justify-end gap-3 py-3">
      <div className="max-w-[min(85%,36rem)] rounded-[1.25rem] rounded-br-md bg-[var(--chat-surface-elevated)] px-4 py-3 text-[0.9375rem] leading-relaxed text-[var(--chat-text)] ring-1 ring-[var(--chat-border-subtle)]">
        {message.attachment_url && (
          <div className="mb-2">
            {message.attachment_mime?.startsWith('image/') ? (
              <img
                src={message.attachment_url}
                alt="Attached"
                className="max-h-52 rounded-lg object-contain"
              />
            ) : (
              <a
                href={message.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 underline"
              >
                View attachment
              </a>
            )}
          </div>
        )}
        {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
        {canEdit && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onEdit}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantMessage({ message, canRegenerate, onRegenerate, conversationTitle }) {
  const isImage = message.content_type === 'image' && message.image_url
  const [copied, setCopied] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)

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

  const handleShare = async () => {
    if (!textContent || shareBusy) return
    setShareBusy(true)
    try {
      const result = await shareReplyNative({
        title: conversationTitle || 'AI Chat',
        content: textContent,
      })
      if (result === 'copied') {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* ignore */
    } finally {
      setShareBusy(false)
    }
  }

  const handleShareCard = async () => {
    if (!textContent || shareBusy) return
    setShareBusy(true)
    try {
      await downloadShareCard({
        title: conversationTitle || 'AI Chat highlight',
        content: textContent,
      })
    } catch {
      /* ignore */
    } finally {
      setShareBusy(false)
    }
  }

  const handleListen = () => {
    if (!textContent) return
    stopSpeaking()
    speakText(textContent)
  }

  return (
    <div className="group animate-message-in flex gap-3 border-b border-[var(--chat-border-subtle)]/50 py-5 last:border-b-0">
      <AssistantAvatar />
      <div className="relative min-w-0 flex-1 pt-0.5">
        {isImage ? (
          <ImageMessageContent message={message} />
        ) : (
          <>
            {message.attachment_url && <AttachmentBlock message={message} />}
            {textContent && (
              <div className="chat-prose text-[var(--chat-text)]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
              </div>
            )}
          </>
        )}
        {!isImage && textContent && (
          <div className="mt-2 flex flex-wrap gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--chat-text-muted)] hover:bg-[var(--chat-surface-elevated)] hover:text-white"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={handleListen}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--chat-text-muted)] hover:bg-[var(--chat-surface-elevated)] hover:text-white"
            >
              Listen
            </button>
            <button
              type="button"
              disabled={shareBusy}
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--chat-text-muted)] hover:bg-[var(--chat-surface-elevated)] hover:text-white"
            >
              Share
            </button>
            <button
              type="button"
              disabled={shareBusy}
              onClick={handleShareCard}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--chat-text-muted)] hover:bg-[var(--chat-surface-elevated)] hover:text-white"
            >
              Card
            </button>
            {canRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-[var(--chat-text-muted)] hover:bg-[var(--chat-surface-elevated)] hover:text-white"
              >
                Regenerate
              </button>
            )}
            {message.streaming && (
              <span className="px-2 py-1 text-xs text-emerald-400/80">Streaming…</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantAvatar() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 ring-1 ring-emerald-500/25"
      aria-hidden
    >
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

function ThinkingDots({ label }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-emerald-400/90">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400"
            style={{ animationDelay: `${i * 140}ms` }}
          />
        ))}
      </span>
      <span className="text-[var(--chat-text-muted)]">{label}…</span>
    </div>
  )
}

function ImageMessageContent({ message }) {
  return (
    <div className="space-y-2">
      <img
        src={message.image_url}
        alt={message.content || 'Generated image'}
        className="max-h-[28rem] w-full rounded-xl object-contain ring-1 ring-[var(--chat-border)]"
      />
      {message.content && message.content !== '[Attachment]' && (
        <p className="text-xs text-[var(--chat-text-muted)]">{message.content}</p>
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
          className="max-h-48 rounded-lg object-contain ring-1 ring-[var(--chat-border)]"
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

function MenuIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function PaperclipIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32a2.25 2.25 0 11-3.182-3.182L13.473 7.286"
      />
    </svg>
  )
}

function SendIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
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

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 18.75a6.75 6.75 0 006.75-6.75V9.75a6.75 6.75 0 00-13.5 0v2.25a6.75 6.75 0 006.75 6.75z"
      />
      <path strokeLinecap="round" d="M12 18.75V21M8.25 21h7.5" />
    </svg>
  )
}

function CopyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.849-1.547 1.26-2.666 1.26h-3c-1.12 0-2.312-.411-2.666-1.26m0 0a2.25 2.25 0 00-2.115-1.47M6.75 15.75v1.5a2.25 2.25 0 002.25 2.25h6a2.25 2.25 0 002.25-2.25v-1.5m-9 0V9.75a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v6"
      />
    </svg>
  )
}
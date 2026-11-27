import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { streamEditMessage, streamNewMessage, streamRegenerateMessage } from '../api/stream'
import ChatPanel from '../components/ChatPanel'
import CreditLimitModal from '../components/CreditLimitModal'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

const STREAM_ASSISTANT_ID = 'stream-assistant'

export default function ChatDashboard() {
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const redirectToLogin = () => {
    navigate('/login', { state: { from: '/' } })
  }

  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [usage, setUsage] = useState(null)
  const [creditModalOpen, setCreditModalOpen] = useState(false)
  const [chatMode, setChatMode] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatSearch, setChatSearch] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [personas, setPersonas] = useState([])
  const [slashCommands, setSlashCommands] = useState([])
  const [defaultPersonaId, setDefaultPersonaId] = useState('friendly')

  const activeConversation = conversations.find((c) => c.id === activeId)
  const activePersonaId = activeConversation?.persona_id || defaultPersonaId

  useEffect(() => {
    api
      .get('/experience')
      .then((res) => {
        setPersonas(res.data.personas || [])
        setSlashCommands(res.data.slash_commands || [])
        setDefaultPersonaId(res.data.default_persona_id || 'friendly')
      })
      .catch(() => {})
  }, [])

  const applyStreamDone = useCallback((data) => {
    if (data.user_message) {
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => !String(m.id).startsWith('temp-') && m.id !== STREAM_ASSISTANT_ID,
        )
        return [...filtered, data.user_message, data.assistant_message]
      })
    } else {
      setMessages((prev) => {
        const withoutStream = prev.filter((m) => m.id !== STREAM_ASSISTANT_ID)
        return [...withoutStream, data.assistant_message]
      })
    }

    if (data.conversation) {
      setConversations((prev) => {
        const rest = prev.filter((c) => c.id !== data.conversation.id)
        return [data.conversation, ...rest]
      })
    }

    if (data.usage) {
      setUsage(data.usage)
      if (data.usage.credit_limit_reached) {
        setCreditModalOpen(true)
      }
    }
  }, [])

  const loadUsage = useCallback(async () => {
    try {
      const res = await api.get('/usage')
      setUsage(res.data.usage)
      return res.data.usage
    } catch {
      return null
    }
  }, [])

  const loadConversations = useCallback(async (search = '') => {
    setSearchLoading(Boolean(search.trim()))
    setLoadingList(!search.trim())
    try {
      const params = search.trim() ? { search: search.trim() } : {}
      const res = await api.get('/conversations', { params })
      setConversations(res.data.conversations)
    } catch {
      setError('Failed to load conversations.')
    } finally {
      setLoadingList(false)
      setSearchLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    setError('')
    try {
      const res = await api.get(`/conversations/${conversationId}`)
      setMessages(res.data.conversation.messages)
    } catch {
      setError('Failed to load messages.')
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      setConversations([])
      setMessages([])
      setActiveId(null)
      setUsage(null)
      setLoadingList(false)
      setError('')
      return
    }
    loadConversations()
    loadUsage()
  }, [loadConversations, loadUsage, isAuthenticated, authLoading])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (!isAuthenticated) return
      loadConversations(chatSearch)
    }, 350)

    return () => clearTimeout(handle)
  }, [chatSearch, isAuthenticated, loadConversations])

  useEffect(() => {
    loadMessages(activeId)
  }, [activeId, loadMessages])

  const handleNewChat = async () => {
    if (!isAuthenticated) {
      redirectToLogin()
      return
    }
    setError('')
    try {
      const res = await api.post('/conversations', { persona_id: defaultPersonaId })
      const created = res.data.conversation
      setConversations((prev) => [created, ...prev])
      setActiveId(created.id)
      setMessages([])
    } catch {
      setError('Could not create a new chat.')
    }
  }

  const handleSelect = (id) => {
    setActiveId(id)
    setError('')
  }

  const handleRename = async (id, title) => {
    try {
      const res = await api.patch(`/conversations/${id}`, { title })
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: res.data.conversation.title } : c)),
      )
    } catch {
      setError('Rename failed.')
    }
  }

  const handlePersonaChange = async (personaId) => {
    if (!activeId || !isAuthenticated) return
    try {
      const res = await api.patch(`/conversations/${activeId}`, { persona_id: personaId })
      const updated = res.data.conversation
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...updated } : c)))
    } catch {
      setError('Could not switch persona.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this conversation?')) return
    try {
      await api.delete(`/conversations/${id}`)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) {
        setActiveId(null)
        setMessages([])
      }
    } catch {
      setError('Delete failed.')
    }
  }

  const openCreditLimit = () => {
    setCreditModalOpen(true)
  }

  const handleApiError = (err) => {
    if (err.response?.status === 402 || err.response?.data?.code === 'credit_limit_reached') {
      if (err.response?.data?.usage) {
        setUsage(err.response.data.usage)
      }
      openCreditLimit()
      setError('')
      return
    }
    if (err.response?.data?.code === 'email_not_verified') {
      setError('Verify your email to send messages. Check your inbox or resend from the banner.')
      return
    }
    setError(
      err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Request failed.',
    )
  }

  const resendVerification = async () => {
    try {
      await api.post('/email/verification-notification')
      setError('')
      window.alert('Verification email sent. Check your inbox.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send verification email.')
    }
  }

  const startStreamAssistant = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: STREAM_ASSISTANT_ID,
        role: 'assistant',
        content: '',
        content_type: 'text',
        streaming: true,
      },
    ])
  }

  const appendStreamChunk = (chunk) => {
    if (!chunk?.text) return
    setMessages((prev) =>
      prev.map((m) =>
        m.id === STREAM_ASSISTANT_ID ? { ...m, content: (m.content || '') + chunk.text } : m,
      ),
    )
  }

  const handleSend = async (content, mode = 'chat', attachment = null) => {
    if (!isAuthenticated) {
      redirectToLogin()
      return
    }

    if (!activeId) {
      setError('Create or select a conversation first.')
      return
    }

    if (usage?.credit_limit_reached) {
      openCreditLimit()
      return
    }

    if (mode === 'image' && usage?.allows_image === false) {
      setError('Image generation requires Pro or Team. Starter is chat-only.')
      return
    }

    const text = content?.trim() || ''
    if (!text && !attachment) {
      return
    }

    setSending(true)
    setError('')
    const optimistic = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text || '[Attachment]',
      attachment_url: attachment?.type?.startsWith('image/')
        ? URL.createObjectURL(attachment)
        : null,
      attachment_mime: attachment?.type || null,
    }
    setMessages((prev) => [...prev, optimistic])

    const useStream = mode === 'chat' && !attachment

    try {
      if (useStream) {
        startStreamAssistant()
        await streamNewMessage(
          activeId,
          { content: text, mode },
          {
            onChunk: appendStreamChunk,
            onDone: (data) => {
              if (optimistic.attachment_url?.startsWith('blob:')) {
                URL.revokeObjectURL(optimistic.attachment_url)
              }
              applyStreamDone(data)
            },
            onError: (data) => {
              setMessages((prev) =>
                prev.filter((m) => m.id !== optimistic.id && m.id !== STREAM_ASSISTANT_ID),
              )
              setError(data.message || 'Streaming failed.')
            },
          },
        )
      } else {
        const payload =
          attachment instanceof File
            ? (() => {
                const form = new FormData()
                form.append('mode', mode)
                form.append('content', text)
                form.append('attachment', attachment)
                return form
              })()
            : { content: text, mode }

        const res = await api.post(`/conversations/${activeId}/messages`, payload)
        if (optimistic.attachment_url?.startsWith('blob:')) {
          URL.revokeObjectURL(optimistic.attachment_url)
        }
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== optimistic.id)
          return [...withoutOptimistic, res.data.user_message, res.data.assistant_message]
        })
        setConversations((prev) => {
          const updated = res.data.conversation
          const rest = prev.filter((c) => c.id !== updated.id)
          return [updated, ...rest]
        })
        if (res.data.usage) {
          setUsage(res.data.usage)
          if (res.data.usage.credit_limit_reached) {
            openCreditLimit()
          }
        } else {
          await loadUsage()
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id && m.id !== STREAM_ASSISTANT_ID),
      )
      if (optimistic.attachment_url?.startsWith('blob:')) {
        URL.revokeObjectURL(optimistic.attachment_url)
      }
      handleApiError(err)
    } finally {
      setSending(false)
    }
  }

  const handleRegenerate = async (message) => {
    if (!activeId || sending) return
    setSending(true)
    setError('')

    setMessages((prev) => prev.filter((m) => m.id !== message.id))
    startStreamAssistant()

    try {
      await streamRegenerateMessage(activeId, message.id, {
        onChunk: appendStreamChunk,
        onDone: applyStreamDone,
        onError: (data) => {
          setMessages((prev) => prev.filter((m) => m.id !== STREAM_ASSISTANT_ID))
          setError(data.message || 'Regenerate failed.')
        },
      })
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== STREAM_ASSISTANT_ID))
      handleApiError(err)
    } finally {
      setSending(false)
    }
  }

  const handleEditMessage = async (message) => {
    if (!activeId || sending) return
    const next = window.prompt('Edit your message:', message.content)
    if (next === null) return
    const trimmed = next.trim()
    if (!trimmed) return

    setSending(true)
    setError('')

    const cutIndex = messages.findIndex((m) => m.id === message.id)
    if (cutIndex === -1) return

    setMessages((prev) =>
      prev.slice(0, cutIndex).concat({ ...message, content: trimmed }),
    )
    startStreamAssistant()

    try {
      await streamEditMessage(activeId, message.id, trimmed, {
        onChunk: appendStreamChunk,
        onDone: (data) => {
          setMessages((prev) => {
            const withoutStream = prev.filter((m) => m.id !== STREAM_ASSISTANT_ID)
            const idx = withoutStream.findIndex((m) => m.id === message.id)
            const head = idx >= 0 ? withoutStream.slice(0, idx) : withoutStream
            return [...head, data.user_message, data.assistant_message]
          })
          if (data.conversation) {
            setConversations((prev) => {
              const rest = prev.filter((c) => c.id !== data.conversation.id)
              return [data.conversation, ...rest]
            })
          }
          if (data.usage) setUsage(data.usage)
        },
        onError: (data) => {
          setMessages((prev) => prev.filter((m) => m.id !== STREAM_ASSISTANT_ID))
          setError(data.message || 'Edit failed.')
          loadMessages(activeId)
        },
      })
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== STREAM_ASSISTANT_ID))
      handleApiError(err)
      loadMessages(activeId)
    } finally {
      setSending(false)
    }
  }

  const showVerifyBanner = isAuthenticated && user && !user.email_verified_at

  return (
    <div className="flex h-full min-h-screen bg-[var(--chat-bg)]">
      <Sidebar
        conversations={loadingList ? [] : conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
        onRename={handleRename}
        onDelete={handleDelete}
        user={user}
        onLogout={logout}
        isGuest={!isAuthenticated}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        chatSearch={chatSearch}
        onChatSearchChange={setChatSearch}
        onChatSearchSubmit={() => loadConversations(chatSearch)}
        searchLoading={searchLoading}
        streakDays={usage?.streak?.current_streak_days || 0}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {showVerifyBanner && (
          <div className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100">
            <span>Verify your email to unlock chat when production verification is enabled.</span>
            <button
              type="button"
              onClick={resendVerification}
              className="rounded-lg bg-amber-600/80 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500"
            >
              Resend email
            </button>
          </div>
        )}
        <ChatPanel
          messages={messages}
          loading={loadingMessages}
          sending={sending}
          error={error}
          onSend={handleSend}
          onRegenerate={handleRegenerate}
          onEditMessage={handleEditMessage}
          conversationTitle={activeConversation?.title}
        usage={usage}
        personas={personas}
        slashCommands={slashCommands}
        personaId={activePersonaId}
        onPersonaChange={handlePersonaChange}
        onUpgradeClick={() =>
          isAuthenticated ? navigate('/plans') : redirectToLogin()
        }
        guestMode={!isAuthenticated}
        mode={chatMode}
        onModeChange={setChatMode}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
      </div>
      <CreditLimitModal
        open={creditModalOpen}
        usage={usage}
        onClose={() => setCreditModalOpen(false)}
      />
    </div>
  )
}
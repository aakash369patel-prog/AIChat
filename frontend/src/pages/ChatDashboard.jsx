import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import ChatPanel from '../components/ChatPanel'
import CreditLimitModal from '../components/CreditLimitModal'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'

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

  const activeConversation = conversations.find((c) => c.id === activeId)

  const loadUsage = useCallback(async () => {
    try {
      const res = await api.get('/usage')
      setUsage(res.data.usage)
      return res.data.usage
    } catch {
      return null
    }
  }, [])

  const loadConversations = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await api.get('/conversations')
      setConversations(res.data.conversations)
    } catch {
      setError('Failed to load conversations.')
    } finally {
      setLoadingList(false)
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
    loadMessages(activeId)
  }, [activeId, loadMessages])

  const handleNewChat = async () => {
    if (!isAuthenticated) {
      redirectToLogin()
      return
    }
    setError('')
    try {
      const res = await api.post('/conversations')
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

    try {
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
        return [
          ...withoutOptimistic,
          res.data.user_message,
          res.data.assistant_message,
        ]
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
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      if (optimistic.attachment_url?.startsWith('blob:')) {
        URL.revokeObjectURL(optimistic.attachment_url)
      }
      if (err.response?.status === 402 || err.response?.data?.code === 'credit_limit_reached') {
        if (err.response?.data?.usage) {
          setUsage(err.response.data.usage)
        }
        openCreditLimit()
        setError('')
      } else {
        setError(
          err.response?.data?.error ||
            err.response?.data?.message ||
            'Failed to send message.',
        )
      }
    } finally {
      setSending(false)
    }
  }

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
      />
      <ChatPanel
        messages={messages}
        loading={loadingMessages}
        sending={sending}
        error={error}
        onSend={handleSend}
        conversationTitle={activeConversation?.title}
        usage={usage}
        onUpgradeClick={() =>
          isAuthenticated ? navigate('/plans') : redirectToLogin()
        }
        guestMode={!isAuthenticated}
        mode={chatMode}
        onModeChange={setChatMode}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
      <CreditLimitModal
        open={creditModalOpen}
        usage={usage}
        onClose={() => setCreditModalOpen(false)}
      />
    </div>
  )
}
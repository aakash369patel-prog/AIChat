const baseURL = () => import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function authHeaders(extra = {}) {
  const headers = { Accept: 'text/event-stream', ...extra }
  const token = localStorage.getItem('auth_token')
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function readSseStream(response, handlers) {
  if (!response.ok) {
    let message = 'Request failed.'
    try {
      const data = await response.json()
      message = data.message || data.error || message
    } catch {
      /* ignore */
    }
    throw Object.assign(new Error(message), { status: response.status })
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('Streaming is not supported in this browser.')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      let event = 'message'
      let dataLine = ''

      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) {
          event = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          dataLine += line.slice(5).trim()
        }
      }

      if (dataLine) {
        let payload
        try {
          payload = JSON.parse(dataLine)
        } catch {
          payload = { raw: dataLine }
        }

        if (event === 'chunk' && handlers.onChunk) {
          handlers.onChunk(payload)
        } else if (event === 'done' && handlers.onDone) {
          handlers.onDone(payload)
        } else if (event === 'error' && handlers.onError) {
          handlers.onError(payload)
        }
      }

      boundary = buffer.indexOf('\n\n')
    }
  }
}

export async function streamNewMessage(conversationId, payload, handlers) {
  const response = await fetch(`${baseURL()}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...payload, stream: true }),
  })

  await readSseStream(response, handlers)
}

export async function streamRegenerateMessage(conversationId, messageId, handlers) {
  const response = await fetch(
    `${baseURL()}/conversations/${conversationId}/messages/${messageId}/regenerate`,
    {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ stream: true }),
    },
  )

  await readSseStream(response, handlers)
}

export async function streamEditMessage(conversationId, messageId, content, handlers) {
  const response = await fetch(`${baseURL()}/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content, stream: true }),
  })

  await readSseStream(response, handlers)
}
function wrapLines(ctx, text, maxWidth, maxLines = 14) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines = []
  let line = ''

  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
      if (lines.length >= maxLines) break
    } else {
      line = test
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line)
  }

  if (words.length && lines.length === maxLines) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, 120)}…`
  }

  return lines
}

export async function downloadShareCard({ title, content }) {
  const width = 1080
  const height = 1080
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#0b1210')
  gradient.addColorStop(1, '#12261f')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#34d399'
  ctx.font = '600 36px Inter, system-ui, sans-serif'
  ctx.fillText('AI Chat Board', 72, 96)

  ctx.fillStyle = '#e2e8f0'
  ctx.font = '500 28px Inter, system-ui, sans-serif'
  const titleLines = wrapLines(ctx, title || 'Chat highlight', 900, 2)
  titleLines.forEach((line, i) => ctx.fillText(line, 72, 160 + i * 38))

  ctx.fillStyle = '#f8fafc'
  ctx.font = '400 32px Inter, system-ui, sans-serif'
  const bodyLines = wrapLines(ctx, content || '', 900, 12)
  bodyLines.forEach((line, i) => ctx.fillText(line, 72, 280 + i * 46))

  ctx.fillStyle = '#64748b'
  ctx.font = '400 24px Inter, system-ui, sans-serif'
  ctx.fillText('Generated with AI — verify important info', 72, height - 72)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create image')

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `ai-chat-share-${Date.now()}.png`
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareReplyNative({ title, content }) {
  const text = `${title}\n\n${content}`.slice(0, 2000)
  if (navigator.share) {
    await navigator.share({ title: 'AI Chat Board', text })
    return 'shared'
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}
export function applySlashCommand(text, slashCommands = []) {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) {
    return { content: text, command: null }
  }

  const space = trimmed.indexOf(' ')
  const token = space === -1 ? trimmed : trimmed.slice(0, space)
  const rest = space === -1 ? '' : trimmed.slice(space + 1).trim()

  const match = slashCommands.find((item) => item.command === token)
  if (!match) {
    return { content: text, command: null }
  }

  if (!rest) {
    return { content: text, command: match, needsMore: true }
  }

  return {
    content: `${match.prefix}${rest}`,
    command: match,
    needsMore: false,
  }
}

export function slashSuggestion(input, slashCommands = []) {
  if (!input.startsWith('/') || input.includes(' ')) return null
  return slashCommands.find((c) => c.command.startsWith(input)) || null
}
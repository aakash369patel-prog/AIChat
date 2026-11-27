import { brand } from '../brand'

/** Public site URL for canonical/OG links (set in frontend `.env`). */
export const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://your-domain.com').replace(
  /\/$/,
  '',
)

export { brand }

/**
 * High-intent / trending terms (2025–2026): conversational AI, ai chat online,
 * gemini chat, ai assistant, enterprise ai chatbot, ai image chat.
 */
export const defaultKeywords = [
  'ai chat',
  'ai chatbot',
  'ai chat online',
  'free ai chat',
  'conversational ai',
  'ai assistant',
  'gemini ai chat',
  'ai chat platform',
  'chatbot platform',
  'ai chatbot builder',
  'enterprise ai chatbot',
  'ai image generator',
  'llm chat',
  'ai chat app',
].join(', ')

const sharedDescription =
  'Chat with AI using Google Gemini. Free trial prompts, saved conversations, image generation on Pro plans, and secure accounts — a modern conversational AI chatbot platform.'

export const routes = {
  '/': {
    title: 'AI Chat Board — Free AI Chatbot & Gemini Assistant Online',
    description: sharedDescription,
    keywords: defaultKeywords,
  },
  '/login': {
    title: 'Log In — AI Chat Board | AI Chat Online',
    description:
      'Sign in to your AI Chat Board account. Continue Gemini-powered chats, conversation history, and billing plans.',
    keywords: 'ai chat login, ai chatbot account, gemini chat sign in, conversational ai',
  },
  '/register': {
    title: 'Create Account — Free AI Chat | AI Chat Board',
    description:
      'Register free for AI Chat Board. Start chatting with Gemini AI, try free prompts, and upgrade when you need more.',
    keywords:
      'free ai chat, ai chatbot free, sign up ai assistant, gemini ai free trial, ai chat online',
  },
  '/plans': {
    title: 'Pricing & Plans — AI Chat Platform | AI Chat Board',
    description:
      'Starter, Pro, and Team plans for AI chat and image generation. Compare quotas, models, and platform pricing.',
    keywords:
      'ai chatbot pricing, ai chat platform plans, gemini api chat, enterprise ai chatbot, ai assistant subscription',
  },
}

export function resolveSeo(pathname) {
  return routes[pathname] ?? routes['/']
}
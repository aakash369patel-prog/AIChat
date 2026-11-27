# Trending SEO guide — AI Chat Board

Use this when updating copy, ads, or store listings. Replace `https://your-domain.com` in `robots.txt`, `sitemap.xml`, and `VITE_SITE_URL` before production.

## Primary keywords (high volume)

| Keyword | Why it matters |
|--------|----------------|
| ai chatbot | Core head term; pair with your brand in titles |
| ai chat / ai chat online | Strong “free trial” intent |
| conversational ai | Trending B2B / platform positioning |
| ai assistant | Broader discovery |
| gemini ai chat | Matches your Gemini stack — differentiate from generic ChatGPT clones |

## Winnable long-tail (lower competition, 2026 trends)

| Keyword | Fit for this project |
|--------|----------------------|
| enterprise ai chatbot | Teams tier, auth, quotas |
| ai chat platform / chatbot platform | SaaS + billing |
| ai chatbot builder | Custom deploy / white-label angle |
| self hosted ai chat | XAMPP / Laravel self-host story |
| ai image generator + chat | Image mode on Pro |
| llm api chat | Developer-minded landing copy |

## Meta copy (live in `index.html` + `src/seo/config.js`)

**Title (home):** `AI Chat Board — Free AI Chatbot & Gemini Assistant Online` (~58 chars)

**Meta description (~155 chars):**  
*Chat with AI using Google Gemini. Free trial prompts, saved conversations, image generation on Pro plans, and secure accounts — a modern conversational AI chatbot platform.*

**Recommended H1 on a future public landing page:** Free AI chat online powered by Gemini

## Technical checklist

1. Set `VITE_SITE_URL=https://your-production-domain.com` in `frontend/.env`
2. Replace domain in `public/robots.txt` and `public/sitemap.xml`
3. Submit sitemap in [Google Search Console](https://search.google.com/search-console)
4. Add `og:image` (1200×630) at `/og-image.png` when you have branding artwork
5. For SPA ranking: consider a prerender step or public marketing page — crawlers still benefit from `index.html` + JSON-LD

## AI search (ChatGPT, Perplexity, Google AI Overviews)

- Lead descriptions with **what it is** + **who it’s for** + **outcome** (already reflected in meta text).
- Keep one primary intent per URL: home = chat product, `/register` = free signup, `/plans` = pricing.
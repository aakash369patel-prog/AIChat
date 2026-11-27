import { useEffect } from 'react'
import { brand, resolveSeo, siteUrl } from './config'

function setMeta(attr, key, content) {
  if (!content) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Updates document title and meta tags when routes change (SPA SEO).
 */
export function usePageSeo(pathname) {
  useEffect(() => {
    const { title, description, keywords } = resolveSeo(pathname)
    const path = pathname === '/' ? '' : pathname
    const url = `${siteUrl}${path}`

    document.title = title

    setMeta('name', 'description', description)
    setMeta('name', 'keywords', keywords)
    setMeta('name', 'robots', 'index, follow')

    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:site_name', brand.name)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:locale', 'en_US')

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)

    setCanonical(url)
  }, [pathname])
}
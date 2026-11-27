import { useLocation } from 'react-router-dom'
import { usePageSeo } from '../seo/usePageSeo'

export default function PageSeo() {
  const { pathname } = useLocation()
  usePageSeo(pathname)
  return null
}
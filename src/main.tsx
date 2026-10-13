import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ArtSheet from './art/ArtSheet'

const q = new URLSearchParams(location.search)
const AvatarPreview = lazy(() => import('./avatar/Preview'))
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {q.has('artsheet') ? <ArtSheet /> : q.has('avatar') ? <Suspense fallback={null}><AvatarPreview /></Suspense> : <App />}
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_PWA !== 'off' && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

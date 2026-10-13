import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ArtSheet from './art/ArtSheet'

const sheet = new URLSearchParams(location.search).has('artsheet')
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {sheet ? <ArtSheet /> : <App />}
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.VITE_PWA !== 'off' && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

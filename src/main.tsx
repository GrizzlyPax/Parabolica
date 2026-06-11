import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// Dev-only league console: the PR 1–4 engine has no UI until PR 6, so this
// exposes it at window.league for hands-on testing. Tree-shaken from builds.
if (import.meta.env.DEV) {
  import('./league/devConsole').then(m => m.installLeagueConsole());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

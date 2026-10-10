import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './look/fonts'
import './look/tokens.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

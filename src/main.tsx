import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './look/fonts'
import './look/tokens.css'
import App from './App.tsx'
import { takeCarryFromLocation } from './storage/carry'

// Saves carried over from playparabolica.com (#701), before the router reads the address.
takeCarryFromLocation()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

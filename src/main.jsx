import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import GARApp from './GARApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GARApp />
  </StrictMode>
)

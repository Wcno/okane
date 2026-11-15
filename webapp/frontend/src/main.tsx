import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { ProveedorDeDatos } from './state/store.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProveedorDeDatos>
        <App />
      </ProveedorDeDatos>
    </BrowserRouter>
  </StrictMode>,
)

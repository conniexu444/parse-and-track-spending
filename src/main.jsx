import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './App.css'
import Navbar from './components/Navbar.jsx'
import CornerThemeToggle from './components/CornerThemeToggle.jsx'
import App from './App.jsx'
import SmartExtract from './pages/SmartExtract.jsx'

function Root() {
  return (
    <div className="app-container">
      <CornerThemeToggle />
      <Navbar />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/smart-extract" element={<SmartExtract />} />
      </Routes>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Root />
    </BrowserRouter>
  </StrictMode>,
)

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Spending Tracker', path: '/' },
  { label: 'Smart Extract', path: '/smart-extract' },
]

function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentIndex = navItems.findIndex(item => item.path === location.pathname)
  const [focused, setFocused] = useState(currentIndex === -1 ? 0 : currentIndex)

  const handleClick = (index) => {
    setFocused(index)
    navigate(navItems[index].path)
  }

  return (
    <nav className="app-navbar">
      {navItems.map((item, index) => (
        <button
          key={item.label}
          type="button"
          className={`navbar-item${focused === index ? ' active' : ''}`}
          onClick={() => handleClick(index)}
        >
          {item.label}
          <AnimatePresence>
            {focused === index && (
              <motion.div
                className="navbar-highlight"
                layoutId="navbar-focused"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>
        </button>
      ))}
    </nav>
  )
}

export default Navbar

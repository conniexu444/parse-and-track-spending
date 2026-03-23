import { useState } from 'react'
import { useMouse } from '../hooks/useMouse'

function GradientCard({ children, className = '', circleSize = 400, onClick }) {
  const [mouse, parentRef] = useMouse()
  const [hovered, setHovered] = useState(false)

  const hasPosition = mouse.elementX !== null && mouse.elementY !== null

  return (
    <div
      ref={parentRef}
      className={`gradient-card ${className}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Spotlight */}
      <div
        className="gradient-card-spotlight"
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          left: `${mouse.elementX}px`,
          top: `${mouse.elementY}px`,
          opacity: hasPosition ? 1 : 0,
          transform: `translate(-50%, -50%) scale(${hovered ? 3 : 1})`,
          maskImage: `radial-gradient(${circleSize / 2}px circle at center, white, transparent)`,
          WebkitMaskImage: `radial-gradient(${circleSize / 2}px circle at center, white, transparent)`,
        }}
      />

      {/* Inner background layer (sits above spotlight, below content) */}
      <div className="gradient-card-bg" />

      {/* Content */}
      <div className="gradient-card-content">
        {children}
      </div>
    </div>
  )
}

export default GradientCard

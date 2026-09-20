import React from 'react'

export default function Brand({
  size = 'md',
  collapsed = false,
  withCar = false,
  theme,
  className = '',
}) {
  if (collapsed) {
    if (theme === 'dark') {
      return (
        <div className={`drift-collapsed-brand ${className}`} title="Drift.co Rental Cars">
          <img
            src="/drift-logo-icon.png"
            alt="Drift.co"
            className="drift-icon-img"
          />
        </div>
      )
    }

    if (theme === 'light') {
      return (
        <div className={`drift-collapsed-brand ${className}`} title="Drift.co Rental Cars">
          <img
            src="/drift-logo-icon-light.png"
            alt="Drift.co"
            className="drift-icon-img"
          />
        </div>
      )
    }

    return (
      <div className={`drift-collapsed-brand ${className}`} title="Drift.co Rental Cars">
        <img
          src="/drift-logo-icon.png"
          alt="Drift.co"
          className="drift-icon-img dark-asset"
        />
        <img
          src="/drift-logo-icon-light.png"
          alt="Drift.co"
          className="drift-icon-img light-asset"
        />
      </div>
    )
  }

  const darkSrc = withCar ? '/drift-logo-full.png' : '/drift-logo-text.png'
  const lightSrc = withCar ? '/drift-logo-full-light.png' : '/drift-logo-text-light.png'

  if (theme === 'dark') {
    return (
      <div
        className={`drift-brand-wrapper drift-${size} ${withCar ? 'drift-with-car' : ''} ${className}`}
        title="Drift.co Rental Cars"
      >
        <img
          src={darkSrc}
          alt="Drift.co Rental Cars"
          className="drift-logo-img"
          style={{ filter: 'drop-shadow(0 2px 10px rgba(229, 27, 36, 0.35))' }}
        />
      </div>
    )
  }

  if (theme === 'light') {
    return (
      <div
        className={`drift-brand-wrapper drift-${size} ${withCar ? 'drift-with-car' : ''} ${className}`}
        title="Drift.co Rental Cars"
      >
        <img
          src={lightSrc}
          alt="Drift.co Rental Cars"
          className="drift-logo-img"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(229, 27, 36, 0.2))' }}
        />
      </div>
    )
  }

  return (
    <div
      className={`drift-brand-wrapper drift-${size} ${withCar ? 'drift-with-car' : ''} ${className}`}
      title="Drift.co Rental Cars"
    >
      <img
        src={darkSrc}
        alt="Drift.co Rental Cars"
        className="drift-logo-img dark-asset"
      />
      <img
        src={lightSrc}
        alt="Drift.co Rental Cars"
        className="drift-logo-img light-asset"
      />
    </div>
  )
}


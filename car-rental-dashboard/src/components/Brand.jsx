import React from 'react'

export default function Brand({
  size = 'md',
  collapsed = false,
  withCar = false,
  className = '',
}) {
  if (collapsed) {
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


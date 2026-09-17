import React from 'react'

export default function Brand({ size = 'md', collapsed = false }) {
  if (collapsed) {
    return (
      <div className="drift-collapsed" title="Drift.co Rental Cars">
        <span className="drift-d">D</span>
        <span className="drift-dot-red">.</span>
      </div>
    )
  }

  return (
    <div className={`drift-brand drift-${size}`}>
      <div className="drift-title">
        <span className="drift-white">Dr</span>
        <span className="drift-i-box">
          <span className="drift-i-dot" />
          <span className="drift-i-stem">ı</span>
        </span>
        <span className="drift-white">ft</span>
        <span className="drift-dot-red">.</span>
        <span className="drift-white">co</span>
      </div>
      <div className="drift-sub">
        <span className="drift-sub-line" />
        <span className="drift-sub-text">RENTAL CARS</span>
        <span className="drift-sub-line" />
      </div>
    </div>
  )
}

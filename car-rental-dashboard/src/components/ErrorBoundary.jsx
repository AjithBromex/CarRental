import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Render Error caught by ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="center-pad" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ color: 'var(--amber)', marginBottom: 12 }}>
            <AlertCircle size={36} />
          </div>
          <h2>Something went wrong displaying this view</h2>
          <p className="hint" style={{ maxWidth: 440, margin: '8px auto 20px' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
          >
            <RotateCcw size={15} /> Reload page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

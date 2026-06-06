import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Global error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('React Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#070b14', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
          color: '#f1f5f9', fontFamily: 'Inter, sans-serif', padding: '20px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>🔗</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>VendorBridge</h1>
          <p style={{ color: '#94a3b8', marginBottom: 20 }}>Something went wrong loading the app.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              color: '#fff', border: 'none', padding: '12px 28px',
              borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 600
            }}
          >
            🔄 Reload App
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre style={{ marginTop: 20, fontSize: 11, color: '#ef4444', maxWidth: 600, overflow: 'auto' }}>
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#0d1425',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#0d1425' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#0d1425' } },
        }}
      />
    </BrowserRouter>
  </ErrorBoundary>
)

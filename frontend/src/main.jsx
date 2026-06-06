import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
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
        error: { iconTheme: { primary: '#ef4444', secondary: '#0d1425' } },
      }}
    />
  </BrowserRouter>
)

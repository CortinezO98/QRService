import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 14px 40px -24px rgba(15, 23, 42, 0.45)',
            fontWeight: 700,
            color: '#0f172a',
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import VerifyPage from './components/VerifyPage.jsx'
import PaymentCallback from './components/PaymentCallback.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/v/:linkId" element={<VerifyPage />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        {/* Alias for Paystack callback paths */}
        <Route path="/callback" element={<PaymentCallback />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)

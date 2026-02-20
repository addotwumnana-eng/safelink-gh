import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { getApiBaseUrl } from '../utils/apiBase'

const API_BASE = getApiBaseUrl()

function PaymentCallback() {
  const [message, setMessage] = useState('Verifying your payment…')
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Paystack may return `reference` or `trxref` depending on integration.
    const reference = params.get('reference') || params.get('trxref')

    if (!reference) {
      setMessage('Missing payment reference (reference/trxref).')
      return
    }

    fetch(`${API_BASE}/api/deals/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reference }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          console.error('Verification failed', data)
          setMessage('Payment not successful. Please try again.')
          return
        }

        console.log('Payment verified:', data)
        setMessage('Payment verified! Returning to app…')

        try {
          const paidDealId = data?.deal?.id
          if (paidDealId) {
            localStorage.setItem('safelink_last_paid_deal_id', paidDealId)
          }
        } catch {
          // ignore storage failures
        }

        const isApp = Capacitor.isNativePlatform()
        if (isApp) {
          // Close in-app browser so user returns to the app; listener there will refresh and go to dashboard
          setTimeout(async () => {
            await Browser.close()
          }, 1500)
        } else {
          setTimeout(() => {
            navigate('/')
          }, 2000)
        }
      })
      .catch((err) => {
        console.error('Error verifying payment', err)
        setMessage('Error verifying payment. Please try again.')
      })
  }, [navigate])

  return (
    <div className="min-h-screen bg-deep-black text-white flex items-center justify-center px-6">
      <div className="mobile-container">
        <p className="text-sm text-ghana-gold text-center">{message}</p>
      </div>
    </div>
  )
}

export default PaymentCallback


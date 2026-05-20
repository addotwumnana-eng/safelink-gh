import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { getApiBaseUrl } from '../utils/apiBase'

const API_BASE = getApiBaseUrl()
const LAST_PAID_DEAL_KEY = 'safelink_last_paid_deal_id'
const PAYMENT_VERIFY_ERROR_KEY = 'safelink_payment_verify_error'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function PaymentCallback() {
  const [message, setMessage] = useState('Verifying your payment…')
  const navigate = useNavigate()

  useEffect(() => {
    const isApp = Capacitor.isNativePlatform()

    const closeOrNavigate = async (delayMs = 1500) => {
      await wait(delayMs)
      if (isApp) {
        try {
          await Browser.close()
        } catch (err) {
          console.warn('Unable to close browser after callback:', err)
        }
      } else {
        navigate('/')
      }
    }

    const setVerifyError = (text) => {
      try {
        localStorage.setItem(PAYMENT_VERIFY_ERROR_KEY, text)
      } catch {
        // ignore storage failures
      }
    }

    const clearVerifyError = () => {
      try {
        localStorage.removeItem(PAYMENT_VERIFY_ERROR_KEY)
      } catch {
        // ignore storage failures
      }
    }

    const run = async () => {
      const params = new URLSearchParams(window.location.search)
      // Paystack may return `reference` or `trxref` depending on integration.
      const reference = params.get('reference') || params.get('trxref')

      if (!reference) {
        const msg = 'Missing payment reference (reference/trxref).'
        setMessage(msg)
        setVerifyError(msg)
        await closeOrNavigate(1800)
        return
      }

      const attempts = 3
      let lastErrorMessage = 'Error verifying payment. Please try again.'

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const res = await fetch(`${API_BASE}/api/deals/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reference }),
          })

          let data = null
          try {
            data = await res.json()
          } catch {
            // ignore parse errors
          }

          if (!res.ok) {
            const backendMsg = data?.error || data?.details || 'Payment verification failed'
            lastErrorMessage = backendMsg
            const retryable = Boolean(data?.retryable) || res.status >= 500 || res.status === 409
            if (retryable && attempt < attempts) {
              setMessage(`Verifying payment… (retry ${attempt + 1}/${attempts})`)
              await wait(1200)
              continue
            }
            throw new Error(backendMsg)
          }

          console.log('Payment verified:', data)
          setMessage('Payment verified! Returning to app…')

          try {
            const paidDealId = data?.deal?.id
            if (paidDealId) {
              localStorage.setItem(LAST_PAID_DEAL_KEY, paidDealId)
            }
          } catch {
            // ignore storage failures
          }
          clearVerifyError()
          await closeOrNavigate(isApp ? 1200 : 1600)
          return
        } catch (err) {
          lastErrorMessage = err?.message || lastErrorMessage
          console.error('Error verifying payment', err)
        }
      }

      const msg = `Payment verification failed: ${lastErrorMessage}`
      setMessage(msg)
      setVerifyError(msg)
      await closeOrNavigate(2200)
    }

    run()
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


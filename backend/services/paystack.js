import dotenv from 'dotenv'
import Paystack from 'paystack'

dotenv.config()

let paystackClient = null
let paystackInitError = null

function getPaystackClient() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    throw new Error('Paystack is not configured (missing PAYSTACK_SECRET_KEY)')
  }

  if (paystackClient) return paystackClient
  if (paystackInitError) {
    throw new Error(`Paystack init failed: ${paystackInitError}`)
  }

  try {
    paystackClient = Paystack(secretKey)
    return paystackClient
  } catch (err) {
    paystackInitError = err?.message || String(err)
    throw new Error(`Paystack init failed: ${paystackInitError}`)
  }
}

/**
 * amount is in GHS, we convert to pesewas (x100)
 * For production / mobile app: set FRONTEND_URL in .env to your deployed frontend URL
 * (e.g. https://safelink-ghana.vercel.app) so Paystack redirects there and the app return flow works.
 */
export async function initializePayment({ email, amount, reference, metadata = {} }) {
  const paystack = getPaystackClient()
  const koboAmount = Math.round(amount * 100)

  const response = await paystack.transaction.initialize({
    email,
    amount: koboAmount,
    reference,
    metadata,
    currency: 'GHS',
    callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`,
  })

  return response
}

export async function verifyPayment(reference) {
  const paystack = getPaystackClient()
  const response = await paystack.transaction.verify(reference)
  return response
}


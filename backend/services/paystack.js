import dotenv from 'dotenv'
import Paystack from 'paystack'

dotenv.config()

const secretKey = process.env.PAYSTACK_SECRET_KEY
if (!secretKey) {
  console.warn('PAYSTACK_SECRET_KEY is not set')
}

const paystack = Paystack(secretKey)

/**
 * amount is in GHS, we convert to pesewas (x100)
 * For production / mobile app: set FRONTEND_URL in .env to your deployed frontend URL
 * (e.g. https://safelink-ghana.vercel.app) so Paystack redirects there and the app return flow works.
 */
export async function initializePayment({ email, amount, reference, metadata = {} }) {
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
  const response = await paystack.transaction.verify(reference)
  return response
}


import dotenv from 'dotenv'
import Paystack from 'paystack'

dotenv.config()

let paystackClient = null
let paystackInitError = null
const PAYSTACK_API_BASE = 'https://api.paystack.co'

function getEscrowActionsMode() {
  const raw = (process.env.PAYSTACK_ESCROW_ACTIONS || 'enabled').trim().toLowerCase()
  return raw === 'disabled' ? 'disabled' : 'enabled'
}

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

function toPesewas(amount) {
  return Math.round(Number(amount || 0) * 100)
}

function sanitizePhoneNumber(input) {
  const digits = String(input || '').replace(/\D/g, '')
  if (digits.startsWith('233') && digits.length === 12) {
    return `0${digits.slice(3)}`
  }
  return digits
}

function formatPaystackError(payload, statusCode, fallback = 'Paystack request failed') {
  const message = payload?.message || payload?.error || fallback
  return `${message}${statusCode ? ` (HTTP ${statusCode})` : ''}`
}

async function paystackRequest(path, { method = 'POST', body } = {}) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    throw new Error('Paystack is not configured (missing PAYSTACK_SECRET_KEY)')
  }

  const response = await fetch(`${PAYSTACK_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // ignore parse error and surface HTTP failure below
  }

  if (!response.ok || !payload?.status) {
    throw new Error(formatPaystackError(payload, response.status))
  }

  return payload
}

function buildSettlementConfigState() {
  if (getEscrowActionsMode() === 'disabled') {
    return {
      enabled: false,
      reason: 'PAYSTACK_ESCROW_ACTIONS=disabled',
    }
  }

  if (!process.env.PAYSTACK_SECRET_KEY) {
    return {
      enabled: false,
      reason: 'PAYSTACK_SECRET_KEY is not set',
    }
  }

  return { enabled: true, reason: null }
}

export function getSettlementConfigState() {
  return buildSettlementConfigState()
}

async function createTransferRecipientForDeal(deal) {
  const bankCode = process.env.PAYSTACK_GH_MOBILE_MONEY_BANK_CODE
  if (!bankCode) {
    throw new Error('PAYSTACK_GH_MOBILE_MONEY_BANK_CODE is required for mobile money payouts')
  }

  const accountNumber = sanitizePhoneNumber(deal.sellerMoMo)
  if (!/^0\d{9}$/.test(accountNumber)) {
    throw new Error('Seller MoMo number is invalid for payout recipient creation')
  }

  const recipientName = deal.sellerName || `SafeLink Seller ${deal.id.slice(0, 8)}`
  const response = await paystackRequest('/transferrecipient', {
    method: 'POST',
    body: {
      type: 'mobile_money',
      name: recipientName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'GHS',
      description: `SafeLink payout recipient for deal ${deal.id}`,
      metadata: {
        dealId: deal.id,
        sellerMoMo: accountNumber,
      },
    },
  })

  const recipientCode = response?.data?.recipient_code
  if (!recipientCode) {
    throw new Error('Paystack did not return recipient_code')
  }

  return {
    recipientCode,
    recipient: response.data,
  }
}

export async function releaseEscrowToSeller(deal, reason = 'SafeLink escrow release') {
  const config = buildSettlementConfigState()
  if (!config.enabled) {
    return {
      mode: 'simulated',
      action: 'release',
      reason: config.reason,
    }
  }

  try {
    let recipientCode = deal.sellerRecipientCode || process.env.PAYSTACK_TRANSFER_RECIPIENT_CODE || null
    let recipient = null

    if (!recipientCode) {
      const createdRecipient = await createTransferRecipientForDeal(deal)
      recipientCode = createdRecipient.recipientCode
      recipient = createdRecipient.recipient
    }

    const amount = toPesewas(deal.price)
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Deal amount is invalid for transfer')
    }

    const reference = `safelink_release_${deal.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)}_${Date.now()}`
      .toLowerCase()
      .slice(0, 100)

    const transferResponse = await paystackRequest('/transfer', {
      method: 'POST',
      body: {
        source: 'balance',
        amount,
        recipient: recipientCode,
        reason,
        currency: 'GHS',
        reference,
      },
    })

    return {
      mode: 'live',
      action: 'release',
      reason: null,
      recipientCode,
      reference,
      transfer: transferResponse?.data || null,
      recipient,
    }
  } catch (err) {
    return {
      mode: 'simulated',
      action: 'release',
      reason: err?.message || 'Paystack transfer failed',
      error: err?.message || 'Paystack transfer failed',
    }
  }
}

export async function refundEscrowPayment(deal, reason = 'SafeLink escrow refund') {
  const config = buildSettlementConfigState()
  if (!config.enabled) {
    return {
      mode: 'simulated',
      action: 'refund',
      reason: config.reason,
    }
  }

  const transactionRef = deal.paymentReference || deal.reference
  if (!transactionRef) {
    return {
      mode: 'simulated',
      action: 'refund',
      reason: 'Deal has no payment reference to refund',
    }
  }

  try {
    const refundResponse = await paystackRequest('/refund', {
      method: 'POST',
      body: {
        transaction: transactionRef,
        currency: 'GHS',
        merchant_note: reason,
        customer_note: reason,
      },
    })

    return {
      mode: 'live',
      action: 'refund',
      reason: null,
      transactionRef,
      refund: refundResponse?.data || null,
    }
  } catch (err) {
    return {
      mode: 'simulated',
      action: 'refund',
      reason: err?.message || 'Paystack refund failed',
      error: err?.message || 'Paystack refund failed',
    }
  }
}

/**
 * amount is in GHS, we convert to pesewas (x100)
 * For production / mobile app: set FRONTEND_URL in .env to your deployed frontend URL
 * (e.g. https://safelink-ghana.vercel.app) so Paystack redirects there and the app return flow works.
 */
export async function initializePayment({ email, amount, reference, metadata = {} }) {
  const paystack = getPaystackClient()
  const koboAmount = toPesewas(amount)

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


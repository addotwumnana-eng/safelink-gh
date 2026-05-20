import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDeals, getDealById, createDeal, updateDeal } from '../utils/database.js'
import {
  initializePayment,
  verifyPayment,
  releaseEscrowToSeller,
  refundEscrowPayment,
} from '../services/paystack.js'

const router = express.Router()

function buildSettlementWarning(settlement) {
  if (settlement?.mode === 'simulated' && settlement?.reason) {
    return `Escrow action ran in simulated mode: ${settlement.reason}`
  }
  return null
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function verifyPaymentWithRetry(reference, attempts = 3, delayMs = 1200) {
  let lastData = null

  for (let index = 0; index < attempts; index += 1) {
    const isLast = index === attempts - 1
    try {
      const verifyResp = await verifyPayment(reference)
      const data = verifyResp?.data
      lastData = data || null

      if (data?.status === 'success') {
        return { ok: true, data }
      }

      const status = String(data?.status || '').toLowerCase()
      const terminalFailure = status && status !== 'pending'
      if (isLast || terminalFailure) {
        return { ok: false, data }
      }
    } catch (err) {
      if (isLast) throw err
    }

    await delay(delayMs)
  }

  return { ok: false, data: lastData }
}

// Create a new deal and initialize Paystack payment
router.post('/create', async (req, res) => {
  try {
    const { itemName, price, sellerMoMo, buyerEmail } = req.body

    if (!itemName || !price || !sellerMoMo || !buyerEmail) {
      return res.status(400).json({ error: 'itemName, price, sellerMoMo and buyerEmail are required' })
    }

    const numericPrice = Number(price)
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ error: 'Invalid price' })
    }

    const serviceFeeRate = 0.01
    const serviceFee = numericPrice * serviceFeeRate
    const totalToPay = numericPrice + serviceFee

    const id = uuidv4()
    const reference = `SL-${id}`

    const deal = {
      id,
      itemName,
      price: numericPrice,
      serviceFee,
      totalToPay,
      sellerMoMo,
      buyerEmail,
      status: 'pending_payment',
      reference,
      createdAt: new Date().toISOString(),
    }

    await createDeal(deal)

    let authorizationUrl = null
    let paymentDisabled = false
    let paymentError = null

    try {
      const paystackResp = await initializePayment({
        email: buyerEmail,
        amount: totalToPay,
        reference,
        metadata: {
          dealId: id,
          itemName,
          sellerMoMo,
        },
      })

      authorizationUrl = paystackResp?.data?.authorization_url || null
      if (!authorizationUrl) {
        paymentDisabled = true
        paymentError = 'Paystack authorization url not returned'
      }
    } catch (err) {
      // Allow SafeLink generation even if Paystack isn't configured.
      paymentDisabled = true
      paymentError = err?.message || 'Paystack initialization failed'
      console.warn('Paystack init failed, returning deal without authorizationUrl:', paymentError)
    }

    res.json({
      deal,
      authorizationUrl,
      paymentDisabled,
      paymentError,
    })
  } catch (err) {
    console.error('Error creating deal:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Verify payment after Paystack redirect
router.post('/verify-payment', async (req, res) => {
  try {
    const { reference } = req.body

    if (!reference) {
      return res.status(400).json({ error: 'reference is required' })
    }

    // Find deal by reference
    const deals = await getDeals()
    const deal = deals.find((d) => d.reference === reference)

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found for this reference' })
    }

    // Idempotent callback: if this deal was already verified for this reference, return success.
    if (
      deal.paymentReference === reference &&
      (deal.status === 'paid' || deal.status === 'completed' || deal.status === 'disputed' || deal.status === 'cancelled')
    ) {
      return res.json({ deal, alreadyVerified: true })
    }

    const verification = await verifyPaymentWithRetry(reference)
    const data = verification?.data

    if (!verification.ok) {
      const status = String(data?.status || '').toLowerCase()
      const retryable = status === 'pending' || !status
      const gatewayMessage = data?.gateway_response || data?.message || null
      return res.status(retryable ? 409 : 400).json({
        error: retryable
          ? 'Payment verification is still pending. Please wait a few seconds and retry.'
          : 'Payment not successful',
        details: gatewayMessage,
        retryable,
        paystack: data,
      })
    }

    const updated = await updateDeal(deal.id, {
      status: deal.status === 'pending_payment' ? 'paid' : deal.status,
      paidAt: deal.paidAt || new Date().toISOString(),
      paymentReference: reference,
      paystackData: data,
    })

    res.json({ deal: updated })
  } catch (err) {
    console.error('Error verifying payment:', err)
    res.status(502).json({
      error: 'Could not verify payment with Paystack',
      details: err?.message || 'Unknown Paystack verification error',
      retryable: true,
    })
  }
})

// List all deals
router.get('/', async (req, res) => {
  try {
    const deals = await getDeals()
    res.json(deals)
  } catch (err) {
    console.error('Error listing deals:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get one deal by id
router.get('/:id', async (req, res) => {
  try {
    const deal = await getDealById(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })
    res.json(deal)
  } catch (err) {
    console.error('Error getting deal:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Confirm receipt (release funds to seller - logically)
router.post('/:id/confirm', async (req, res) => {
  try {
    const deal = await getDealById(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    if (deal.status !== 'paid') {
      return res.status(400).json({ error: 'Deal is not in paid state' })
    }

    const settlement = await releaseEscrowToSeller(deal, `Release escrow for deal ${deal.id}`)

    const updated = await updateDeal(deal.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      settlement: {
        ...(deal.settlement || {}),
        released: settlement,
      },
    })

    res.json({
      deal: updated,
      settlement,
      warning: buildSettlementWarning(settlement),
    })
  } catch (err) {
    console.error('Error confirming receipt:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Cancel / refund
router.post('/:id/cancel', async (req, res) => {
  try {
    const deal = await getDealById(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    if (deal.status !== 'paid' && deal.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Deal cannot be cancelled in current state' })
    }

    const settlement = deal.status === 'paid'
      ? await refundEscrowPayment(deal, `Refund cancelled deal ${deal.id}`)
      : {
          mode: 'simulated',
          action: 'refund',
          reason: 'Deal was pending_payment; no Paystack refund required',
        }

    const updated = await updateDeal(deal.id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      settlement: {
        ...(deal.settlement || {}),
        refunded: settlement,
      },
    })

    res.json({
      deal: updated,
      settlement,
      warning: buildSettlementWarning(settlement),
    })
  } catch (err) {
    console.error('Error cancelling deal:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/dispute', async (req, res) => {
  try {
    const deal = await getDealById(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    if (deal.status !== 'paid' && deal.status !== 'active') {
      return res.status(400).json({ error: 'Only paid/active deals can be disputed' })
    }

    const disputeReason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
    const updated = await updateDeal(deal.id, {
      status: 'disputed',
      disputedAt: new Date().toISOString(),
      disputeReason: disputeReason || deal.disputeReason || null,
    })

    res.json({ deal: updated })
  } catch (err) {
    console.error('Error opening dispute:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/dispute/resolve', async (req, res) => {
  try {
    const deal = await getDealById(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    if (deal.status !== 'disputed') {
      return res.status(400).json({ error: 'Deal is not in disputed state' })
    }

    const outcome = req.body?.outcome
    if (outcome !== 'refund' && outcome !== 'release') {
      return res.status(400).json({ error: "outcome must be either 'refund' or 'release'" })
    }

    const settlement = outcome === 'refund'
      ? await refundEscrowPayment(deal, `Dispute resolved with refund for deal ${deal.id}`)
      : await releaseEscrowToSeller(deal, `Dispute resolved with release for deal ${deal.id}`)

    const updates = {
      disputeResolvedAt: new Date().toISOString(),
      disputeOutcome: outcome,
      settlement: {
        ...(deal.settlement || {}),
        [outcome === 'refund' ? 'refunded' : 'released']: settlement,
      },
    }

    if (outcome === 'refund') {
      updates.status = 'cancelled'
      updates.cancelledAt = new Date().toISOString()
    } else {
      updates.status = 'completed'
      updates.completedAt = new Date().toISOString()
    }

    const updated = await updateDeal(deal.id, updates)

    res.json({
      deal: updated,
      settlement,
      warning: buildSettlementWarning(settlement),
    })
  } catch (err) {
    console.error('Error resolving dispute:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


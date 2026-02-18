import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDeals, getDealById, createDeal, updateDeal } from '../utils/database.js'
import { initializePayment, verifyPayment } from '../services/paystack.js'

const router = express.Router()

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

    const verifyResp = await verifyPayment(reference)
    const data = verifyResp?.data

    if (!data || data.status !== 'success') {
      return res.status(400).json({ error: 'Payment not successful', paystack: data })
    }

    const updated = await updateDeal(deal.id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      paymentReference: reference,
      paystackData: data,
    })

    res.json({ deal: updated })
  } catch (err) {
    console.error('Error verifying payment:', err)
    res.status(500).json({ error: 'Internal server error' })
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

    const updated = await updateDeal(deal.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })

    // Here is where, in a full escrow, you would trigger a Paystack transfer to sellerMoMo

    res.json({ deal: updated })
  } catch (err) {
    console.error('Error confirming receipt:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Cancel / refund (logical status change – actual refund would also call Paystack)
router.post('/:id/cancel', async (req, res) => {
  try {
    const deal = await getDealById(req.params.id)
    if (!deal) return res.status(404).json({ error: 'Deal not found' })

    if (deal.status !== 'paid' && deal.status !== 'pending_payment') {
      return res.status(400).json({ error: 'Deal cannot be cancelled in current state' })
    }

    const updated = await updateDeal(deal.id, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    })

    // In a full implementation, you’d call Paystack to refund here.

    res.json({ deal: updated })
  } catch (err) {
    console.error('Error cancelling deal:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router


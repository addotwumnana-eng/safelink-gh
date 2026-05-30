import express from 'express'
import {
  activateSubscriptionFromGooglePlay,
  activateSubscriptionPlan,
  getPlanConfigById,
  getSubscriptionPlans,
  getSubscriptionStatus,
  isPaidPlan,
} from '../services/subscriptionService.js'
import { initializePayment, verifyPayment } from '../services/paystack.js'

const router = express.Router()

function getDeviceId(req) {
  const fromBody = String(req.body?.deviceId || '').trim()
  const fromHeader = String(req.headers['x-device-id'] || '').trim()
  const fromQuery = String(req.query?.deviceId || '').trim()
  return fromBody || fromHeader || fromQuery
}

function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY.trim())
}

function isManualActivationAllowed() {
  return String(process.env.ALLOW_MANUAL_SUBSCRIPTION_ACTIVATION || '').toLowerCase() === 'true'
}

function getGooglePlayConfig() {
  const weeklyProductId = String(process.env.PLAY_BILLING_WEEKLY_PRODUCT_ID || '').trim()
  const weeklyPlanId = String(process.env.PLAY_BILLING_WEEKLY_PLAN_ID || '').trim()
  const monthlyProductId = String(process.env.PLAY_BILLING_MONTHLY_PRODUCT_ID || '').trim()
  const monthlyPlanId = String(process.env.PLAY_BILLING_MONTHLY_PLAN_ID || '').trim()

  return {
    weeklyProductId,
    weeklyPlanId,
    monthlyProductId,
    monthlyPlanId,
    isConfigured: Boolean(weeklyProductId && weeklyPlanId && monthlyProductId && monthlyPlanId),
  }
}

router.get('/plans', (_req, res) => {
  return res.json({
    plans: getSubscriptionPlans(),
    paystackConfigured: isPaystackConfigured(),
    googlePlay: getGooglePlayConfig(),
  })
})

router.get('/status', async (req, res) => {
  try {
    const deviceId = getDeviceId(req)
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    const subscription = await getSubscriptionStatus(deviceId)
    return res.json({
      deviceId,
      subscription,
      paystackConfigured: isPaystackConfigured(),
      googlePlay: getGooglePlayConfig(),
    })
  } catch (error) {
    console.error('Subscription status failed:', error)
    return res.status(500).json({ error: 'Unable to load subscription right now' })
  }
})

router.post('/activate', async (req, res) => {
  try {
    if (!isManualActivationAllowed()) {
      return res.status(403).json({
        error: 'Manual activation disabled. Use Paystack payment flow.',
      })
    }

    const deviceId = getDeviceId(req)
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    const planId = String(req.body?.planId || req.body?.plan || '').trim().toLowerCase()
    if (!planId) return res.status(400).json({ error: 'planId is required' })

    const subscription = await activateSubscriptionPlan(deviceId, planId)
    return res.json({
      deviceId,
      subscription,
      message: `${subscription.planLabel} activated successfully`,
    })
  } catch (error) {
    if (error.message.includes('plan must be')) {
      return res.status(400).json({ error: error.message })
    }

    console.error('Activate subscription failed:', error)
    return res.status(500).json({ error: 'Unable to activate subscription right now' })
  }
})

router.post('/paystack/initialize', async (req, res) => {
  try {
    const deviceId = getDeviceId(req)
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    const planId = String(req.body?.planId || '').trim().toLowerCase()
    if (!isPaidPlan(planId)) {
      return res.status(400).json({ error: 'planId must be weekly or monthly' })
    }

    const email = String(req.body?.email || '').trim().toLowerCase()
    if (!email) return res.status(400).json({ error: 'email is required' })

    if (!isPaystackConfigured()) {
      return res.status(400).json({ error: 'Paystack is not configured on the backend yet.' })
    }

    const plan = getPlanConfigById(planId)
    const reference = `SUB-${planId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const callbackUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const paymentResponse = await initializePayment({
      email,
      amount: plan.priceGhs,
      reference,
      callbackUrl,
      metadata: {
        purpose: 'subscription',
        planId,
        deviceId,
      },
    })

    return res.json({
      deviceId,
      planId,
      reference,
      authorizationUrl: paymentResponse?.data?.authorization_url || null,
      accessCode: paymentResponse?.data?.access_code || null,
      message: 'Payment initialized. Complete payment to activate plan.',
    })
  } catch (error) {
    console.error('Paystack initialize failed:', error)
    return res.status(500).json({
      error: error?.message || 'Unable to initialize Paystack payment',
    })
  }
})

router.post('/paystack/verify', async (req, res) => {
  try {
    const reference = String(req.body?.reference || req.body?.trxref || '').trim()
    if (!reference) return res.status(400).json({ error: 'reference is required' })

    if (!isPaystackConfigured()) {
      return res.status(400).json({ error: 'Paystack is not configured on the backend yet.' })
    }

    const verifyResponse = await verifyPayment(reference)
    const data = verifyResponse?.data

    if (!data || data.status !== 'success') {
      return res.status(400).json({
        error: 'Payment not successful',
        paystackStatus: data?.status || null,
      })
    }

    const metadata = data.metadata || {}
    const purpose = String(metadata.purpose || '').trim().toLowerCase()
    const planId = String(metadata.planId || '').trim().toLowerCase()
    const deviceId = String(metadata.deviceId || '').trim()

    if (purpose !== 'subscription' || !isPaidPlan(planId) || !deviceId) {
      return res.status(400).json({
        error: 'Payment metadata is invalid for subscription activation',
      })
    }

    const plan = getPlanConfigById(planId)
    const expectedAmount = Math.round(plan.priceGhs * 100)
    if (Number(data.amount) !== expectedAmount) {
      return res.status(400).json({
        error: 'Paid amount does not match selected subscription plan',
      })
    }

    const subscription = await activateSubscriptionPlan(deviceId, planId)
    return res.json({
      message: `${subscription.planLabel} activated after successful payment`,
      reference,
      deviceId,
      subscription,
    })
  } catch (error) {
    console.error('Paystack verify failed:', error)
    return res.status(500).json({
      error: error?.message || 'Unable to verify Paystack payment',
    })
  }
})

router.post('/google-play/activate', async (req, res) => {
  try {
    const deviceId = getDeviceId(req)
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    const planId = String(req.body?.planId || req.body?.plan || '').trim().toLowerCase()
    if (!isPaidPlan(planId)) {
      return res.status(400).json({ error: 'planId must be weekly or monthly' })
    }

    const transaction = req.body?.transaction || {}
    const purchaseToken = String(transaction.purchaseToken || req.body?.purchaseToken || '').trim()
    const productIdentifier = String(
      transaction.productIdentifier || req.body?.productIdentifier || ''
    ).trim()
    const transactionId = String(transaction.transactionId || req.body?.transactionId || '').trim()
    const purchaseDate = String(transaction.purchaseDate || req.body?.purchaseDate || '').trim()
    const purchaseState = String(transaction.purchaseState || req.body?.purchaseState || '').trim()

    if (!purchaseToken) {
      return res.status(400).json({ error: 'purchaseToken is required from Google Play transaction' })
    }

    if (purchaseState && purchaseState !== '1' && purchaseState.toUpperCase() !== 'PURCHASED') {
      return res.status(400).json({
        error: 'Google Play transaction is not in purchased state',
      })
    }

    const playConfig = getGooglePlayConfig()
    const expectedProductId = planId === 'weekly' ? playConfig.weeklyProductId : playConfig.monthlyProductId
    if (expectedProductId && productIdentifier && productIdentifier !== expectedProductId) {
      return res.status(400).json({
        error: `Product mismatch for ${planId} plan`,
      })
    }

    const activation = await activateSubscriptionFromGooglePlay({
      deviceId,
      planId,
      purchaseToken,
      productIdentifier,
      transactionId,
      purchaseDate,
    })

    return res.json({
      deviceId,
      subscription: activation.subscription,
      wasAlreadyProcessed: activation.wasAlreadyProcessed,
      message: activation.wasAlreadyProcessed
        ? 'Google Play purchase was already processed for this device.'
        : `${activation.subscription.planLabel} activated with Google Play purchase.`,
    })
  } catch (error) {
    console.error('Google Play activation failed:', error)
    return res.status(500).json({
      error: error?.message || 'Unable to activate Google Play subscription right now',
    })
  }
})

export default router

import express from 'express'
import {
  activateSubscriptionPlan,
  getSubscriptionPlans,
  getSubscriptionStatus,
} from '../services/subscriptionService.js'

const router = express.Router()

function getDeviceId(req) {
  const fromBody = String(req.body?.deviceId || '').trim()
  const fromHeader = String(req.headers['x-device-id'] || '').trim()
  return fromBody || fromHeader
}

router.get('/plans', (_req, res) => {
  return res.json({ plans: getSubscriptionPlans() })
})

router.get('/status', async (req, res) => {
  try {
    const deviceId = String(req.query?.deviceId || req.headers['x-device-id'] || '').trim()
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    const subscription = await getSubscriptionStatus(deviceId)
    return res.json({ deviceId, subscription })
  } catch (error) {
    console.error('Subscription status failed:', error)
    return res.status(500).json({ error: 'Unable to load subscription right now' })
  }
})

router.post('/activate', async (req, res) => {
  try {
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

export default router

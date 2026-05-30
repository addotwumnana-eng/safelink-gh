import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { analyzeWebsite, analyzeAppIdentity } from '../services/riskEngine.js'
import { readJsonFile } from '../utils/jsonStore.js'
import { consumeScanAllowance } from '../services/subscriptionService.js'

const router = express.Router()

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(currentDir, '../data')
const fakeDomainsPath = path.join(dataDir, 'fake_domains.json')
const trustedBrandsPath = path.join(dataDir, 'trusted_brands.json')

async function loadRiskData() {
  const [blockedDomains, trustedBrands] = await Promise.all([
    readJsonFile(fakeDomainsPath, []),
    readJsonFile(trustedBrandsPath, []),
  ])

  return { blockedDomains, trustedBrands }
}

function getDeviceId(req) {
  const fromBody = String(req.body?.deviceId || '').trim()
  const fromHeader = String(req.headers['x-device-id'] || '').trim()
  return fromBody || fromHeader
}

router.post('/url', async (req, res) => {
  try {
    const url = String(req.body?.url || '').trim()
    if (!url) return res.status(400).json({ error: 'url is required' })
    const deviceId = getDeviceId(req)
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    const allowance = await consumeScanAllowance(deviceId, 'url')
    if (!allowance.allowed) {
      return res.status(402).json({
        error: 'Free plan limit reached. Upgrade to weekly or monthly unlimited.',
        code: 'FREE_LIMIT_REACHED',
        subscription: allowance.subscription,
      })
    }

    const { blockedDomains, trustedBrands } = await loadRiskData()
    const result = analyzeWebsite(url, { blockedDomains, trustedBrands })

    return res.json({
      input: { url, deviceId },
      ...result,
      subscription: allowance.subscription,
    })
  } catch (error) {
    console.error('URL scan failed:', error)
    return res.status(500).json({ error: 'Unable to scan URL right now' })
  }
})

router.post('/app', async (req, res) => {
  try {
    const deviceId = getDeviceId(req)
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' })

    const allowance = await consumeScanAllowance(deviceId, 'app')
    if (!allowance.allowed) {
      return res.status(402).json({
        error: 'Free plan limit reached. Upgrade to weekly or monthly unlimited.',
        code: 'FREE_LIMIT_REACHED',
        subscription: allowance.subscription,
      })
    }

    const payload = {
      appName: req.body?.appName,
      packageName: req.body?.packageName,
      developerName: req.body?.developerName,
      deviceId,
    }

    const { trustedBrands } = await loadRiskData()
    const result = analyzeAppIdentity(payload, trustedBrands)

    return res.json({
      input: payload,
      ...result,
      subscription: allowance.subscription,
    })
  } catch (error) {
    console.error('App scan failed:', error)
    return res.status(500).json({ error: 'Unable to scan app right now' })
  }
})

router.get('/brands', async (_req, res) => {
  try {
    const trustedBrands = await readJsonFile(trustedBrandsPath, [])
    const stripped = trustedBrands.map((brand) => ({
      brand: brand.brand,
      officialDomains: brand.officialDomains || [],
      officialApps: (brand.officialApps || []).map((app) => ({
        appName: app.appName,
        packageName: app.packageName,
        developerName: app.developerName,
      })),
    }))

    return res.json(stripped)
  } catch (error) {
    console.error('Brands listing failed:', error)
    return res.status(500).json({ error: 'Unable to load verified brands right now' })
  }
})

export default router

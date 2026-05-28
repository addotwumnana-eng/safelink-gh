import express from 'express'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { readJsonFile, writeJsonFile } from '../utils/jsonStore.js'

const router = express.Router()
const reportsPath = path.resolve('./data/reports.json')

router.post('/', async (req, res) => {
  try {
    const type = String(req.body?.type || '').trim().toLowerCase()
    const value = String(req.body?.value || '').trim()
    const description = String(req.body?.description || '').trim()
    const contact = String(req.body?.contact || '').trim()

    if (!['url', 'app'].includes(type)) {
      return res.status(400).json({ error: 'type must be url or app' })
    }

    if (!value) {
      return res.status(400).json({ error: 'value is required' })
    }

    const reports = await readJsonFile(reportsPath, [])
    const report = {
      id: uuidv4(),
      type,
      value,
      description,
      contact,
      status: 'new',
      createdAt: new Date().toISOString(),
    }

    reports.unshift(report)
    await writeJsonFile(reportsPath, reports.slice(0, 1000))

    return res.status(201).json({
      message: 'Report submitted successfully',
      report,
    })
  } catch (error) {
    console.error('Create report failed:', error)
    return res.status(500).json({ error: 'Unable to submit report right now' })
  }
})

router.get('/', async (_req, res) => {
  try {
    const reports = await readJsonFile(reportsPath, [])
    return res.json(reports.slice(0, 100))
  } catch (error) {
    console.error('List reports failed:', error)
    return res.status(500).json({ error: 'Unable to load reports right now' })
  }
})

export default router

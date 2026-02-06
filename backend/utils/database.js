import fs from 'fs/promises'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const dbPath = process.env.DATABASE_PATH || './data/deals.json'

async function ensureDbFile() {
  const fullPath = path.resolve(dbPath)
  const dir = path.dirname(fullPath)

  try {
    await fs.mkdir(dir, { recursive: true })
  } catch (err) {
    console.error('Error creating DB directory:', err)
  }

  try {
    await fs.access(fullPath)
  } catch {
    await fs.writeFile(fullPath, JSON.stringify([]), 'utf8')
  }

  return fullPath
}

export async function getDeals() {
  const fullPath = await ensureDbFile()
  const raw = await fs.readFile(fullPath, 'utf8')
  try {
    return JSON.parse(raw || '[]')
  } catch {
    return []
  }
}

export async function saveDeals(deals) {
  const fullPath = await ensureDbFile()
  await fs.writeFile(fullPath, JSON.stringify(deals, null, 2), 'utf8')
}

export async function getDealById(id) {
  const deals = await getDeals()
  return deals.find((d) => d.id === id)
}

export async function createDeal(deal) {
  const deals = await getDeals()
  deals.push(deal)
  await saveDeals(deals)
  return deal
}

export async function updateDeal(id, updates) {
  const deals = await getDeals()
  const idx = deals.findIndex((d) => d.id === id)
  if (idx === -1) return null

  const updated = { ...deals[idx], ...updates }
  deals[idx] = updated
  await saveDeals(deals)
  return updated
}
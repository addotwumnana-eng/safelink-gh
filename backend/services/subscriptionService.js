import path from 'path'
import { fileURLToPath } from 'url'
import { readJsonFile, writeJsonFile } from '../utils/jsonStore.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const subscriptionsPath = path.resolve(currentDir, '../data/subscriptions.json')

const FREE_LIMIT_PER_DAY = 1

const planConfig = {
  free: {
    id: 'free',
    label: 'Freemium',
    priceGhs: 0,
    durationDays: null,
    unlimited: false,
  },
  weekly: {
    id: 'weekly',
    label: 'Weekly Unlimited',
    priceGhs: 5,
    durationDays: 7,
    unlimited: true,
  },
  monthly: {
    id: 'monthly',
    label: 'Monthly Unlimited',
    priceGhs: 15,
    durationDays: 30,
    unlimited: true,
  },
}

const paidPlanIds = ['weekly', 'monthly']

function getTodayKey(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

function createFreeRecord(now = new Date()) {
  return {
    planId: 'free',
    startedAt: now.toISOString(),
    expiresAt: null,
    updatedAt: now.toISOString(),
  }
}

function toSafeObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function normalizeStore(rawStore) {
  const store = toSafeObject(rawStore)
  return {
    users: toSafeObject(store.users),
    usage: toSafeObject(store.usage),
  }
}

function ensureUsageRecordForDate(store, deviceId, dateKey) {
  if (!store.usage[deviceId] || typeof store.usage[deviceId] !== 'object') {
    store.usage[deviceId] = {}
  }

  const dayUsage = store.usage[deviceId][dateKey]
  if (!dayUsage || typeof dayUsage !== 'object') {
    store.usage[deviceId][dateKey] = { total: 0, url: 0, app: 0 }
    return store.usage[deviceId][dateKey]
  }

  store.usage[deviceId][dateKey] = {
    total: Number(dayUsage.total || 0),
    url: Number(dayUsage.url || 0),
    app: Number(dayUsage.app || 0),
  }
  return store.usage[deviceId][dateKey]
}

function normalizeUserRecord(record, now = new Date()) {
  const fallback = createFreeRecord(now)
  if (!record || typeof record !== 'object') return fallback

  const rawPlanId = String(record.planId || 'free').toLowerCase()
  const planId = planConfig[rawPlanId] ? rawPlanId : 'free'
  const normalized = {
    planId,
    startedAt: record.startedAt || fallback.startedAt,
    expiresAt: record.expiresAt || null,
    updatedAt: record.updatedAt || fallback.updatedAt,
  }

  if (paidPlanIds.includes(planId) && normalized.expiresAt) {
    const expiresAt = new Date(normalized.expiresAt)
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) {
      return createFreeRecord(now)
    }
  }

  return normalized
}

function summarizeSubscription(record, usageToday) {
  const plan = planConfig[record.planId] || planConfig.free
  const scansUsedToday = Number(usageToday.total || 0)
  const todayLimit = plan.unlimited ? null : FREE_LIMIT_PER_DAY
  const scansRemainingToday = plan.unlimited
    ? null
    : Math.max(0, FREE_LIMIT_PER_DAY - scansUsedToday)

  return {
    planId: plan.id,
    planLabel: plan.label,
    priceGhs: plan.priceGhs,
    unlimited: plan.unlimited,
    startedAt: record.startedAt,
    expiresAt: record.expiresAt,
    scansUsedToday,
    todayLimit,
    scansRemainingToday,
  }
}

async function loadStore() {
  const store = await readJsonFile(subscriptionsPath, { users: {}, usage: {} })
  return normalizeStore(store)
}

async function saveStore(store) {
  await writeJsonFile(subscriptionsPath, store)
}

function buildAvailablePlans() {
  return Object.values(planConfig).map((plan) => ({
    id: plan.id,
    label: plan.label,
    priceGhs: plan.priceGhs,
    durationDays: plan.durationDays,
    unlimited: plan.unlimited,
    dailyLimit: plan.unlimited ? null : FREE_LIMIT_PER_DAY,
  }))
}

export function getSubscriptionPlans() {
  return buildAvailablePlans()
}

export async function getSubscriptionStatus(deviceId) {
  const now = new Date()
  const dateKey = getTodayKey(now)
  const store = await loadStore()

  const existingRecord = normalizeUserRecord(store.users[deviceId], now)
  const previousRecord = JSON.stringify(store.users[deviceId] || {})
  const normalizedRecord = JSON.stringify(existingRecord)

  store.users[deviceId] = existingRecord
  const usageToday = ensureUsageRecordForDate(store, deviceId, dateKey)

  if (previousRecord !== normalizedRecord) {
    await saveStore(store)
  }

  return summarizeSubscription(existingRecord, usageToday)
}

export async function activateSubscriptionPlan(deviceId, planId) {
  const normalizedPlanId = String(planId || '').trim().toLowerCase()
  if (!paidPlanIds.includes(normalizedPlanId)) {
    throw new Error('plan must be weekly or monthly')
  }

  const now = new Date()
  const store = await loadStore()
  const plan = planConfig[normalizedPlanId]
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

  store.users[deviceId] = {
    planId: normalizedPlanId,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    updatedAt: now.toISOString(),
  }

  const dateKey = getTodayKey(now)
  const usageToday = ensureUsageRecordForDate(store, deviceId, dateKey)

  await saveStore(store)

  return summarizeSubscription(store.users[deviceId], usageToday)
}

export async function consumeScanAllowance(deviceId, scanType) {
  const now = new Date()
  const dateKey = getTodayKey(now)
  const store = await loadStore()

  const userRecord = normalizeUserRecord(store.users[deviceId], now)
  store.users[deviceId] = userRecord

  const usageToday = ensureUsageRecordForDate(store, deviceId, dateKey)
  const summaryBefore = summarizeSubscription(userRecord, usageToday)
  const isAllowed = summaryBefore.unlimited || summaryBefore.scansRemainingToday > 0

  if (!isAllowed) {
    await saveStore(store)
    return {
      allowed: false,
      subscription: summaryBefore,
    }
  }

  usageToday.total += 1
  if (scanType === 'url') usageToday.url += 1
  if (scanType === 'app') usageToday.app += 1

  await saveStore(store)

  return {
    allowed: true,
    subscription: summarizeSubscription(userRecord, usageToday),
  }
}

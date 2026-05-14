import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import request from 'supertest'

let app
let dbDir
let saveDeals
let createDeal

async function seedDeal(status = 'paid', overrides = {}) {
  const now = new Date().toISOString()
  const baseDeal = {
    id: `deal-${Math.random().toString(36).slice(2, 12)}`,
    itemName: 'Test item',
    price: 100,
    serviceFee: 1,
    totalToPay: 101,
    sellerMoMo: '0551234567',
    buyerEmail: 'buyer@example.com',
    status,
    reference: `SL-${Math.random().toString(36).slice(2, 10)}`,
    paymentReference: `SL-PAY-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: now,
    paidAt: now,
    ...overrides,
  }
  await createDeal(baseDeal)
  return baseDeal
}

test.before(async () => {
  dbDir = await fs.mkdtemp(path.join(os.tmpdir(), 'safelink-backend-test-'))
  process.env.DATABASE_PATH = path.join(dbDir, 'deals.json')
  process.env.PAYSTACK_ESCROW_ACTIONS = 'disabled'
  delete process.env.PAYSTACK_SECRET_KEY

  const appModule = await import('../app.js')
  const databaseModule = await import('../utils/database.js')
  app = appModule.default
  saveDeals = databaseModule.saveDeals
  createDeal = databaseModule.createDeal
})

test.beforeEach(async () => {
  await saveDeals([])
})

test.after(async () => {
  await fs.rm(dbDir, { recursive: true, force: true })
})

test('opens dispute and resolves with refund (persisted)', async () => {
  const deal = await seedDeal('paid')

  const disputeRes = await request(app)
    .post(`/api/deals/${deal.id}/dispute`)
    .send({})
    .expect(200)

  assert.equal(disputeRes.body.deal.status, 'disputed')
  assert.ok(disputeRes.body.deal.disputedAt)

  const resolveRes = await request(app)
    .post(`/api/deals/${deal.id}/dispute/resolve`)
    .send({ outcome: 'refund' })
    .expect(200)

  assert.equal(resolveRes.body.deal.status, 'cancelled')
  assert.equal(resolveRes.body.settlement.action, 'refund')
  assert.equal(resolveRes.body.settlement.mode, 'simulated')
  assert.match(resolveRes.body.warning, /simulated mode/i)

  const getRes = await request(app).get(`/api/deals/${deal.id}`).expect(200)
  assert.equal(getRes.body.status, 'cancelled')
  assert.equal(getRes.body.disputeOutcome, 'refund')
})

test('resolves disputed deal with release', async () => {
  const deal = await seedDeal('disputed', { disputedAt: new Date().toISOString() })

  const resolveRes = await request(app)
    .post(`/api/deals/${deal.id}/dispute/resolve`)
    .send({ outcome: 'release' })
    .expect(200)

  assert.equal(resolveRes.body.deal.status, 'completed')
  assert.equal(resolveRes.body.settlement.action, 'release')
  assert.equal(resolveRes.body.settlement.mode, 'simulated')
})

test('confirm receipt applies settlement metadata', async () => {
  const deal = await seedDeal('paid')

  const res = await request(app)
    .post(`/api/deals/${deal.id}/confirm`)
    .send({})
    .expect(200)

  assert.equal(res.body.deal.status, 'completed')
  assert.equal(res.body.settlement.action, 'release')
  assert.equal(res.body.settlement.mode, 'simulated')
  assert.ok(res.body.deal.settlement?.released)
})

test('cancel pending payment skips live refund', async () => {
  const deal = await seedDeal('pending_payment')

  const res = await request(app)
    .post(`/api/deals/${deal.id}/cancel`)
    .send({})
    .expect(200)

  assert.equal(res.body.deal.status, 'cancelled')
  assert.equal(res.body.settlement.action, 'refund')
  assert.equal(res.body.settlement.mode, 'simulated')
  assert.match(res.body.settlement.reason, /no paystack refund required/i)
})

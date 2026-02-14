/**
 * SafeLink Ghana fee utilities.
 *
 * Notes:
 * - "Service fee" here is SafeLink's platform fee.
 * - "E‑Levy" varies by channel/provider and exemptions; this is a calculator model.
 */

export const DEFAULT_SERVICE_FEE_RATE = 0.01
export const DEFAULT_E_LEVY_RATE = 0.01

export function toMoney(n) {
  const x = Number(n)
  return Number.isFinite(x) ? x : 0
}

export function round2(n) {
  return Math.round((toMoney(n) + Number.EPSILON) * 100) / 100
}

/**
 * @param {object} input
 * @param {number} input.amount Base transaction amount (GHS)
 * @param {number} [input.serviceFeeRate] SafeLink fee rate
 * @param {number} [input.eLevyRate] E‑Levy rate
 * @param {boolean} [input.includeELevy] include E‑Levy in totals
 */
export function calculateMoMoCosts({
  amount,
  serviceFeeRate = DEFAULT_SERVICE_FEE_RATE,
  eLevyRate = DEFAULT_E_LEVY_RATE,
  includeELevy = true,
} = {}) {
  const base = Math.max(0, toMoney(amount))
  const serviceFee = base * toMoney(serviceFeeRate)
  const eLevy = includeELevy ? base * toMoney(eLevyRate) : 0

  // What SafeLink charges/locks (Paystack amount today)
  const totalToLock = base + serviceFee

  // Estimated debit (channel dependent)
  const estimatedTotalDebit = totalToLock + eLevy

  return {
    base: round2(base),
    serviceFee: round2(serviceFee),
    eLevy: round2(eLevy),
    totalToLock: round2(totalToLock),
    estimatedTotalDebit: round2(estimatedTotalDebit),
    serviceFeeRate,
    eLevyRate,
    includeELevy,
  }
}


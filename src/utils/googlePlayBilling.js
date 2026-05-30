import { Capacitor } from '@capacitor/core'
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases'

export const playBillingConfig = {
  weekly: {
    productId: (import.meta.env.VITE_PLAY_BILLING_WEEKLY_PRODUCT_ID || '').trim(),
    planId: (import.meta.env.VITE_PLAY_BILLING_WEEKLY_PLAN_ID || '').trim(),
  },
  monthly: {
    productId: (import.meta.env.VITE_PLAY_BILLING_MONTHLY_PRODUCT_ID || '').trim(),
    planId: (import.meta.env.VITE_PLAY_BILLING_MONTHLY_PLAN_ID || '').trim(),
  },
}

export function isAndroidNativePlatform() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

export function hasCompletePlayBillingConfig() {
  return (
    Boolean(playBillingConfig.weekly.productId) &&
    Boolean(playBillingConfig.weekly.planId) &&
    Boolean(playBillingConfig.monthly.productId) &&
    Boolean(playBillingConfig.monthly.planId)
  )
}

export async function isPlayBillingSupported() {
  if (!isAndroidNativePlatform()) {
    return { supported: false, reason: 'Not running on native Android.' }
  }

  const { isBillingSupported } = await NativePurchases.isBillingSupported()
  if (!isBillingSupported) {
    return { supported: false, reason: 'Google Play Billing is not supported on this device.' }
  }

  return { supported: true, reason: null }
}

export async function loadPlayBillingProducts() {
  const productIdentifiers = [
    playBillingConfig.weekly.productId,
    playBillingConfig.monthly.productId,
  ].filter(Boolean)

  if (!productIdentifiers.length) return []

  const { products } = await NativePurchases.getProducts({
    productIdentifiers,
    productType: PURCHASE_TYPE.SUBS,
  })

  return products || []
}

export function getPlanBillingInfo(planId) {
  const normalized = String(planId || '').trim().toLowerCase()
  if (normalized === 'weekly') return playBillingConfig.weekly
  if (normalized === 'monthly') return playBillingConfig.monthly
  return null
}

export async function purchasePlanWithGooglePlay({ planId, appAccountToken }) {
  const billingInfo = getPlanBillingInfo(planId)
  if (!billingInfo?.productId || !billingInfo?.planId) {
    throw new Error('Google Play Billing plan IDs are not configured correctly.')
  }

  const transaction = await NativePurchases.purchaseProduct({
    productIdentifier: billingInfo.productId,
    planIdentifier: billingInfo.planId,
    productType: PURCHASE_TYPE.SUBS,
    appAccountToken,
    autoAcknowledgePurchases: true,
  })

  return transaction
}


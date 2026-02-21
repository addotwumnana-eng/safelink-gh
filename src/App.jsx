import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import NewDealForm from './components/NewDealForm'
import SafeLinkDisplay from './components/SafeLinkDisplay'
import Toast from './components/Toast'
import { getApiBaseUrl } from './utils/apiBase'

const API_BASE = getApiBaseUrl()
const PENDING_DEAL_KEY = 'safelink_pending_deal_id'
const LAST_PAID_DEAL_KEY = 'safelink_last_paid_deal_id'

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [deals, setDeals] = useState([])
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [generatedLink, setGeneratedLink] = useState(null)
  const [authorizationUrl, setAuthorizationUrl] = useState(null)
  const [paymentError, setPaymentError] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [includeELevyEstimate, setIncludeELevyEstimate] = useState(() => {
    const raw = localStorage.getItem('safelink_include_e_levy_estimate')
    if (raw === null) return true
    return raw === 'true'
  })

  // Load deals from backend on mount
  useEffect(() => {
    const loadDeals = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/deals`)
        if (res.ok) {
          const data = await res.json()
          setDeals(data)
        } else {
          console.error('Failed to load deals')
        }
      } catch (err) {
        console.error('Error loading deals:', err)
      } finally {
        setLoadingDeals(false)
      }
    }

    loadDeals()
  }, [])

  useEffect(() => {
    localStorage.setItem('safelink_include_e_levy_estimate', String(includeELevyEstimate))
  }, [includeELevyEstimate])

  const showToast = useCallback((msg) => setToastMessage(msg), [])

  const trustScore = useMemo(() => {
    const completed = deals.filter((d) => d.status === 'completed').length
    const cancelled = deals.filter((d) => d.status === 'cancelled').length
    return Math.min(100, Math.max(0, 50 + completed * 5 - cancelled * 10))
  }, [deals])

  const holdingBalance = useMemo(() => {
    const holdingDeals = deals.filter(
      (d) => d.status === 'paid' || d.status === 'active' || d.status === 'disputed'
    )
    return holdingDeals.reduce((sum, d) => sum + (d.totalToPay || d.price || 0), 0)
  }, [deals])

  const maybeRevealSafeLinkAfterPayment = useCallback((nextDeals) => {
    const getCandidateId = () => {
      try {
        return localStorage.getItem(LAST_PAID_DEAL_KEY) || localStorage.getItem(PENDING_DEAL_KEY)
      } catch {
        return null
      }
    }

    const candidateId = getCandidateId()
    if (!candidateId) return false

    const deal = (nextDeals || []).find((d) => d.id === candidateId)
    if (!deal) return false

    if (deal.status === 'paid' || deal.status === 'active' || deal.status === 'disputed' || deal.status === 'completed') {
      setGeneratedLink(deal)
      setAuthorizationUrl(null)
      setPaymentError(null)
      setCurrentView('safeLink')
      showToast('Payment verified. Copy your SafeLink and share with the seller.')
      try {
        localStorage.removeItem(PENDING_DEAL_KEY)
        localStorage.removeItem(LAST_PAID_DEAL_KEY)
      } catch {
        // ignore
      }
      return true
    }

    return false
  }, [showToast])

  const handleNewDeal = () => {
    setCurrentView('newDeal')
  }

  const handlePaymentReturn = async () => {
    const nextDeals = await refreshDeals()
    if (nextDeals && maybeRevealSafeLinkAfterPayment(nextDeals)) return
    setCurrentView('dashboard')
    setGeneratedLink(null)
    setAuthorizationUrl(null)
    setPaymentError(null)
    showToast('Payment complete!')
  }

  // Refresh deals from backend
  const refreshDeals = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/deals`)
      if (res.ok) {
        const data = await res.json()
        setDeals(data)
        return data
      }
    } catch (err) {
      console.error('Error refreshing deals:', err)
    }
    return null
  }

  const handleConfirmReceipt = async (dealId) => {
    try {
      const res = await fetch(`${API_BASE}/api/deals/${dealId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const error = await res.json()
        showToast(error.error || 'Failed to confirm receipt')
        return
      }

      const data = await res.json()
      await refreshDeals()
      showToast('Receipt confirmed! Funds released to seller.')
    } catch (err) {
      console.error('Error confirming receipt:', err)
      showToast('Error confirming receipt. Please try again.')
    }
  }

  const handleCancelDeal = async (dealId) => {
    try {
      const res = await fetch(`${API_BASE}/api/deals/${dealId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const error = await res.json()
        showToast(error.error || 'Failed to cancel deal')
        return
      }

      const data = await res.json()
      await refreshDeals()
      showToast('Deal cancelled. Funds returned.')
    } catch (err) {
      console.error('Error cancelling deal:', err)
      showToast('Error cancelling deal. Please try again.')
    }
  }

  const handleDispute = (dealId) => {
    // For now, dispute is handled locally (backend doesn't have dispute endpoint yet)
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || (deal.status !== 'paid' && deal.status !== 'active')) return
    setDeals((d) =>
      d.map((x) =>
        x.id === dealId ? { ...x, status: 'disputed', disputedAt: new Date().toISOString() } : x
      )
    )
    showToast('Dispute opened.')
  }

  const handleResolveDisputeRefund = (dealId) => {
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.status !== 'disputed') return
    setDeals((d) =>
      d.map((x) => (x.id === dealId ? { ...x, status: 'cancelled' } : x))
    )
    showToast('Dispute resolved. Funds returned.')
  }

  const handleResolveDisputeRelease = (dealId) => {
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.status !== 'disputed') return
    setDeals((d) =>
      d.map((x) => (x.id === dealId ? { ...x, status: 'completed' } : x))
    )
    showToast('Dispute resolved. Funds released to seller.')
  }

  const handleViewSafeLink = (deal) => {
    setGeneratedLink(deal)
    setAuthorizationUrl(null)
    setPaymentError(null)
    setCurrentView('safeLink')
  }

  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setGeneratedLink(null)
    setAuthorizationUrl(null)
    setPaymentError(null)
  }

  // After a redirect back from Paystack (web), reveal SafeLink once the paid deal is visible.
  useEffect(() => {
    if (loadingDeals) return
    maybeRevealSafeLinkAfterPayment(deals)
  }, [loadingDeals, deals, maybeRevealSafeLinkAfterPayment])

  return (
    <div className="min-h-screen bg-deep-black mobile-container">
      <AnimatePresence mode="wait">
        {currentView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Dashboard
              trustScore={trustScore}
              holdingBalance={holdingBalance}
              deals={deals}
              loadingDeals={loadingDeals}
              includeELevyEstimate={includeELevyEstimate}
              onToggleELevyEstimate={setIncludeELevyEstimate}
              onConfirmReceipt={handleConfirmReceipt}
              onCancelDeal={handleCancelDeal}
              onDispute={handleDispute}
              onResolveDisputeRefund={handleResolveDisputeRefund}
              onResolveDisputeRelease={handleResolveDisputeRelease}
              onViewSafeLink={handleViewSafeLink}
              onNewDeal={handleNewDeal}
            />
          </motion.div>
        )}

        {currentView === 'newDeal' && (
          <motion.div
            key="newDeal"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <NewDealForm
              onBack={handleBackToDashboard}
              includeELevyEstimate={includeELevyEstimate}
              onToggleELevyEstimate={setIncludeELevyEstimate}
              showToast={showToast}
              onPaymentReturn={handlePaymentReturn}
            />
          </motion.div>
        )}

        {currentView === 'safeLink' && generatedLink && (
          <motion.div
            key="safeLink"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <SafeLinkDisplay
              linkData={generatedLink}
              authorizationUrl={authorizationUrl}
              paymentError={paymentError}
              onBack={handleBackToDashboard}
              showToast={showToast}
              onPaymentReturn={handlePaymentReturn}
              includeELevyEstimate={includeELevyEstimate}
              onToggleELevyEstimate={setIncludeELevyEstimate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  )
}

export default App
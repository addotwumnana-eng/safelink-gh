import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import NewDealForm from './components/NewDealForm'
import SafeLinkDisplay from './components/SafeLinkDisplay'
import Toast from './components/Toast'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [deals, setDeals] = useState([])
  const [loadingDeals, setLoadingDeals] = useState(true)
  const [availableBalance, setAvailableBalance] = useState(() => {
    const v = parseFloat(localStorage.getItem('safelink_available_balance'))
    return Number.isFinite(v) ? v : 1250.5
  })
  const [holdingBalance, setHoldingBalance] = useState(() => {
    const v = parseFloat(localStorage.getItem('safelink_holding_balance'))
    return Number.isFinite(v) ? v : 0
  })
  const [generatedLink, setGeneratedLink] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // Backend test state
  const [backendMessage, setBackendMessage] = useState('Connecting to backend...')

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

  // Call backend test endpoint once on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/test`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Backend response:', data)
        setBackendMessage(`Backend says: ${data.message || 'OK'}`)
      })
      .catch((err) => {
        console.error('Error talking to backend:', err)
        setBackendMessage('Failed to reach backend')
      })
  }, [])

  const showToast = (msg) => setToastMessage(msg)

  const trustScore = useMemo(() => {
    const completed = deals.filter((d) => d.status === 'completed').length
    const cancelled = deals.filter((d) => d.status === 'cancelled').length
    return Math.min(100, Math.max(0, 50 + completed * 5 - cancelled * 10))
  }, [deals])

  // Calculate holding balance from backend deals
  useEffect(() => {
    const paidDeals = deals.filter((d) => d.status === 'paid' || d.status === 'pending_payment')
    const totalHolding = paidDeals.reduce((sum, d) => sum + (d.totalToPay || d.price || 0), 0)
    setHoldingBalance(totalHolding)
  }, [deals])

  useEffect(() => {
    localStorage.setItem('safelink_available_balance', String(availableBalance))
    localStorage.setItem('safelink_holding_balance', String(holdingBalance))
  }, [availableBalance, holdingBalance])

  const handleNewDeal = () => {
    setCurrentView('newDeal')
  }

  const handleDealCreated = (linkData) => {
    setGeneratedLink(linkData)
    showToast('Deal created! Redirecting to Paystack...')
  }

  const handlePaymentReturn = () => {
    refreshDeals().then(() => {
      setCurrentView('dashboard')
      setGeneratedLink(null)
      showToast('Payment complete! Check My Deals.')
    })
  }

  // Refresh deals from backend
  const refreshDeals = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/deals`)
      if (res.ok) {
        const data = await res.json()
        setDeals(data)
      }
    } catch (err) {
      console.error('Error refreshing deals:', err)
    }
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
    const amount = deal.totalToPay ?? deal.price
    setHoldingBalance((h) => h - amount)
    setAvailableBalance((a) => a + amount)
    setDeals((d) =>
      d.map((x) => (x.id === dealId ? { ...x, status: 'cancelled' } : x))
    )
    showToast('Dispute resolved. Funds returned.')
  }

  const handleResolveDisputeRelease = (dealId) => {
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.status !== 'disputed') return
    const amount = deal.totalToPay ?? deal.price
    setHoldingBalance((h) => h - amount)
    setDeals((d) =>
      d.map((x) => (x.id === dealId ? { ...x, status: 'completed' } : x))
    )
    showToast('Dispute resolved. Funds released to seller.')
  }

  const handleTopUp = (amount) => {
    setAvailableBalance((a) => a + amount)
    showToast('Funds added')
  }

  const handleViewSafeLink = (deal) => {
    setGeneratedLink(deal)
    setCurrentView('safeLink')
  }

  const handleBackToDashboard = () => {
    setCurrentView('dashboard')
    setGeneratedLink(null)
  }

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
              availableBalance={availableBalance}
              holdingBalance={holdingBalance}
              deals={deals}
              loadingDeals={loadingDeals}
              onConfirmReceipt={handleConfirmReceipt}
              onCancelDeal={handleCancelDeal}
              onDispute={handleDispute}
              onResolveDisputeRefund={handleResolveDisputeRefund}
              onResolveDisputeRelease={handleResolveDisputeRelease}
              onTopUp={handleTopUp}
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
              availableBalance={availableBalance}
              onDealCreated={handleDealCreated}
              onBack={handleBackToDashboard}
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
              onBack={handleBackToDashboard}
              showToast={showToast}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show backend status at the bottom */}
      <p className="text-xs text-emerald-400 mt-2 text-center">
        {backendMessage}
      </p>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  )
}

export default App
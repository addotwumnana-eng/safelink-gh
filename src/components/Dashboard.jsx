import { useState } from 'react'
import { Shield, Lock, CheckCircle, FileText, Plus, X, Link2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import MoMoOptimizer from './MoMoOptimizer'
import ELevyToggle from './ELevyToggle'

function Dashboard({ trustScore, availableBalance, holdingBalance, deals, loadingDeals, includeELevyEstimate, onToggleELevyEstimate, onConfirmReceipt, onCancelDeal, onDispute, onResolveDisputeRefund, onResolveDisputeRelease, onTopUp, onViewSafeLink, onNewDeal }) {
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const getTrustScoreColor = (score) => {
    if (score >= 80) return 'text-ghana-gold'
    if (score >= 60) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getTrustScoreBg = (score) => {
    if (score >= 80) return 'bg-ghana-gold/10 border-ghana-gold/30'
    if (score >= 60) return 'bg-yellow-400/10 border-yellow-400/30'
    return 'bg-orange-400/10 border-orange-400/30'
  }

  const getStatusMeta = (status) => {
    switch (status) {
      case 'pending_payment':
        return { label: 'Pending payment', pill: 'bg-slate-700/60 text-slate-300' }
      case 'paid':
      case 'active':
        return { label: 'In escrow', pill: 'bg-ghana-gold/20 text-ghana-gold' }
      case 'disputed':
        return { label: 'Disputed', pill: 'bg-amber-900/30 text-amber-400' }
      case 'cancelled':
        return { label: 'Cancelled', pill: 'bg-red-900/30 text-red-400' }
      case 'completed':
        return { label: 'Completed', pill: 'bg-emerald-900/25 text-emerald-300' }
      default:
        return { label: status || 'Unknown', pill: 'bg-gray-700 text-gray-300' }
    }
  }

  return (
    <div className="min-h-screen bg-deep-black text-white pb-8">
      {/* Header */}
      <div className="bg-charcoal/50 backdrop-blur-sm border-b border-ghana-gold/20 px-6 pt-12 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
          <h1 className="text-2xl font-bold" style={{ color: '#FFD700' }}>SafeLink Ghana</h1>
            <p className="text-gray-400 text-sm mt-1">Secure Escrow & Payments</p>
          </div>
          <Shield className="w-8 h-8 text-ghana-gold" />
        </div>
      </div>

      {/* Trust Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`mx-6 mt-6 rounded-2xl p-6 border ${getTrustScoreBg(trustScore)}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-ghana-gold" />
            <span className="text-gray-300 font-medium">Trust Score</span>
          </div>
          <span className={`text-3xl font-bold ${getTrustScoreColor(trustScore)}`}>
            {trustScore}
          </span>
        </div>
        <div className="w-full bg-charcoal/50 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${trustScore}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full ${trustScore >= 80 ? 'bg-ghana-gold' : trustScore >= 60 ? 'bg-yellow-400' : 'bg-orange-400'}`}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Based on successful transactions and account history
        </p>
      </motion.div>

      {/* Balance Cards */}
      <div className="mx-6 mt-6 grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-charcoal/50 rounded-2xl p-5 border border-gray-800/50"
        >
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-ghana-gold" />
            <span className="text-gray-400 text-sm">Holding (Escrow)</span>
          </div>
          <p className="text-2xl font-bold text-white">GHS {holdingBalance.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Secured funds</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-charcoal/50 rounded-2xl p-5 border border-gray-800/50"
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-gray-400 text-sm">Available</span>
          </div>
          <p className="text-2xl font-bold text-white">GHS {availableBalance.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">Ready to use</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTopUpModal(true)}
            className="mt-2 w-full py-2 rounded-lg bg-ghana-gold text-white text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Top up
          </motion.button>
        </motion.div>
      </div>

      {/* Paystack – Available balance & Top up */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mx-6 mt-6 rounded-2xl p-5 border border-ghana-gold/30 bg-ghana-gold/5"
      >
        <h3 className="text-gray-300 text-sm font-medium mb-2">Paystack</h3>
        <p className="text-2xl font-bold text-white mb-1">GHS {availableBalance.toFixed(2)}</p>
        <p className="text-xs text-gray-500 mb-3">Available balance</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowTopUpModal(true)}
          className="w-full py-2.5 rounded-xl bg-ghana-gold text-white text-sm font-medium flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Top up
        </motion.button>
      </motion.div>

      {/* Top up Modal */}
      <AnimatePresence>
        {showTopUpModal && (
          <motion.div
            key="topUpModal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTopUpModal(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-charcoal border border-gray-700 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Add funds</h3>
                <button
                  onClick={() => setShowTopUpModal(false)}
                  className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <label className="block text-gray-400 text-sm mb-2">Amount (GHS)</label>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ghana-gold font-semibold">GHS</span>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full bg-deep-black border border-gray-700 rounded-xl pl-14 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-gold"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                onClick={() => {
                  const amt = parseFloat(topUpAmount)
                  if (amt > 0) {
                    onTopUp(amt)
                    setTopUpAmount('')
                    setShowTopUpModal(false)
                  }
                }}
                className="w-full bg-ghana-gold text-deep-black font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add funds
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MoMo Optimizer Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mx-6 mt-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-gray-400">
            E‑Levy estimates
            <span className="ml-2 text-gray-600">({includeELevyEstimate ? 'On' : 'Off'})</span>
          </div>
          <ELevyToggle checked={includeELevyEstimate} onChange={onToggleELevyEstimate} size="sm" />
        </div>
        <MoMoOptimizer includeELevyEstimate={includeELevyEstimate} onToggleELevyEstimate={onToggleELevyEstimate} />
      </motion.div>

      {/* My Deals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mx-6 mt-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-ghana-gold" />
          <h3 className="text-lg font-semibold text-white">My Deals</h3>
        </div>
        {loadingDeals ? (
          <p className="text-gray-500 text-sm py-4 text-center bg-charcoal/30 rounded-xl border border-gray-800/50">
            Loading deals...
          </p>
        ) : deals.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center bg-charcoal/30 rounded-xl border border-gray-800/50">
            No deals yet. Create one with New Secure Deal.
          </p>
        ) : (
          <div className="space-y-3">
            {[...deals]
              .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0))
              .map((deal) => (
                <div
                  key={deal.id}
                  className="bg-charcoal/50 rounded-xl p-4 border border-gray-800/50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-white font-medium">{deal.itemName}</span>
                    {(() => {
                      const meta = getStatusMeta(deal.status)
                      return (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        meta.pill
                      }`}
                    >
                      {meta.label}
                    </span>
                      )
                    })()}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
                    <span>GHS {(deal.totalToPay ?? deal.price).toFixed(2)}</span>
                    <span className="font-mono text-xs truncate max-w-[140px]" title={deal.safeLink || deal.id}>
                      {deal.id?.substring(0, 8)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onViewSafeLink(deal)}
                      className="w-full py-2 rounded-lg bg-charcoal/80 text-ghana-gold text-sm font-medium border border-ghana-gold/40 flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      View SafeLink
                    </motion.button>

                    {deal.status === 'pending_payment' && (
                      <p className="text-xs text-gray-400">
                        Complete payment to lock funds in escrow (SafeLink will update automatically after Paystack confirms).
                      </p>
                    )}

                    {(deal.status === 'paid' || deal.status === 'active') && (
                    <div className="mt-2 space-y-2">
                      {deal.status === 'paid' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (window.confirm('Confirm you received the item? Funds will be released to the seller.')) {
                              onConfirmReceipt(deal.id)
                            }
                          }}
                          className="w-full py-2 rounded-lg bg-ghana-gold/20 text-ghana-gold text-sm font-medium border border-ghana-gold/40"
                        >
                          Confirm receipt
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (window.confirm('Open a dispute? Funds will stay in escrow until you resolve.')) {
                            onDispute(deal.id)
                          }
                        }}
                        className="w-full py-2 rounded-lg text-amber-400/90 text-sm border border-amber-400/30 hover:bg-amber-900/20"
                      >
                        Dispute
                      </motion.button>
                    </div>
                  )}

                    {(deal.status === 'paid' || deal.status === 'pending_payment') && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (window.confirm('Cancel this deal? Funds will be returned.')) {
                            onCancelDeal(deal.id)
                          }
                        }}
                        className="w-full py-2 rounded-lg text-red-400/90 text-sm border border-red-400/30 hover:bg-red-900/20"
                      >
                        Cancel deal
                      </motion.button>
                    )}

                    {deal.status === 'disputed' && (
                      <>
                        <p className="text-xs text-amber-400/80">Resolve dispute:</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (window.confirm('Refund yourself? Funds will return to your balance.')) {
                              onResolveDisputeRefund(deal.id)
                            }
                          }}
                          className="w-full py-2 rounded-lg bg-charcoal/80 text-amber-400 text-sm font-medium border border-amber-400/40"
                        >
                          Refund me
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (window.confirm('Release funds to the seller?')) {
                              onResolveDisputeRelease(deal.id)
                            }
                          }}
                          className="w-full py-2 rounded-lg bg-ghana-gold/20 text-ghana-gold text-sm font-medium border border-ghana-gold/40"
                        >
                          Release to seller
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </motion.div>

      {/* New Secure Deal Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mx-6 mt-8"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewDeal}
          className="w-full bg-ghana-gold text-deep-black font-bold py-4 rounded-2xl shadow-lg shadow-ghana-gold/20 flex items-center justify-center gap-2"
        >
          <Shield className="w-5 h-5" />
          <span>New Secure Deal</span>
        </motion.button>
      </motion.div>

      {/* Security Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mx-6 mt-6 flex items-center justify-center gap-2 text-gray-400 text-sm"
      >
        <Lock className="w-4 h-4" />
        <span>Bank-level encryption & security</span>
      </motion.div>
    </div>
  )
}

export default Dashboard

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Shield, Lock } from 'lucide-react'
import { DEFAULT_E_LEVY_RATE, DEFAULT_SERVICE_FEE_RATE, calculateMoMoCosts } from '../utils/fees'
import ELevyToggle from './ELevyToggle'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

function NewDealForm({ availableBalance, onDealCreated, onBack, includeELevyEstimate, onToggleELevyEstimate, showToast }) {
  const [formData, setFormData] = useState({
    itemName: '',
    price: '',
    sellerMoMo: '',
    buyerEmail: '',
  })

  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)
  const [localIncludeELevy, setLocalIncludeELevy] = useState(true)
  const includeELevy = typeof includeELevyEstimate === 'boolean' ? includeELevyEstimate : localIncludeELevy

  const setInclude = (next) => {
    if (typeof includeELevyEstimate === 'boolean') {
      onToggleELevyEstimate?.(next)
    } else {
      setLocalIncludeELevy(next)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required'
    }
    
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required'
    } else {
      const base = parseFloat(formData.price)
      const costs = calculateMoMoCosts({
        amount: base,
        serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
        eLevyRate: DEFAULT_E_LEVY_RATE,
        includeELevy,
      })
      if (costs.totalToLock > (availableBalance ?? Infinity)) {
        newErrors.price = 'Insufficient balance'
      }
    }
    
    if (!formData.sellerMoMo.trim()) {
      newErrors.sellerMoMo = 'Seller MoMo number is required'
    } else if (!/^0\d{9}$/.test(formData.sellerMoMo.replace(/\s/g, ''))) {
      newErrors.sellerMoMo = 'Invalid MoMo number format'
    }

    if (!formData.buyerEmail.trim()) {
      newErrors.buyerEmail = 'Buyer email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.buyerEmail)) {
      newErrors.buyerEmail = 'Invalid email address'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setSubmitError('')
    try {
      const price = parseFloat(formData.price)

      // Call backend to create deal + initialize Paystack payment.
      const response = await fetch(`${API_BASE}/api/deals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemName: formData.itemName,
          price,
          sellerMoMo: formData.sellerMoMo,
          buyerEmail: formData.buyerEmail
        })
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('Failed to create deal on backend', text)
        setSubmitError('Could not create deal. Check that the backend is running and reachable.')
        showToast?.('Failed to create deal (backend error)')
        return
      }

      const data = await response.json()
      const deal = data?.deal
      const authorizationUrl = data?.authorizationUrl

      if (!deal) {
        console.error('Missing deal from backend', data)
        setSubmitError('Could not create deal (invalid backend response).')
        showToast?.('Failed to create deal')
        return
      }

      // Hand off to app state: show SafeLink screen, let user copy/link-share,
      // then proceed to payment from there.
      onDealCreated?.({ deal, authorizationUrl, includeELevy })
    } catch (err) {
      console.error('Error creating deal / initializing Paystack', err)
      setSubmitError(
        `Network/CORS error. Confirm backend is reachable at ${API_BASE} and that CORS allows your frontend URL.`
      )
      showToast?.('Network error talking to backend')
    } finally {
      setLoading(false)
    }
  }

  const previewCosts = calculateMoMoCosts({
    amount: parseFloat(formData.price || '0'),
    serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
    eLevyRate: DEFAULT_E_LEVY_RATE,
    includeELevy,
  })

  return (
    <div className="min-h-screen bg-deep-black text-white">
      {/* Header */}
      <div className="bg-charcoal/50 backdrop-blur-sm border-b border-ghana-gold/20 px-6 pt-12 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="p-2 hover:bg-charcoal rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-ghana-gold" />
          </motion.button>
          <div>
            <h2 className="text-2xl font-bold text-ghana-gold">New Secure Deal</h2>
            <p className="text-gray-400 text-sm mt-1">Create an escrow transaction</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-6 mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Item Name */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Item Name
            </label>
            <input
              type="text"
              name="itemName"
              value={formData.itemName}
              onChange={handleChange}
              placeholder="e.g., iPhone 13 Pro"
              className={`w-full bg-charcoal/50 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:border-transparent ${
                errors.itemName ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            {errors.itemName && (
              <p className="text-red-400 text-xs mt-1">{errors.itemName}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Price (GHS)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ghana-gold font-semibold">
                GHS
              </span>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full bg-charcoal/50 border rounded-xl pl-16 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:border-transparent ${
                  errors.price ? 'border-red-500' : 'border-gray-700'
                }`}
              />
            </div>
            {errors.price && (
              <p className="text-red-400 text-xs mt-1">{errors.price}</p>
            )}

            {parseFloat(formData.price || '0') > 0 && (
              <div className="mt-3 bg-deep-black/40 rounded-xl p-4 border border-gray-800 space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>SafeLink service fee (1%)</span>
                  <span className="text-orange-400">+GHS {previewCosts.serviceFee.toFixed(2)}</span>
                </div>
                {includeELevy && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>E‑Levy ({Math.round(DEFAULT_E_LEVY_RATE * 100)}%)</span>
                    <span className="text-orange-400">+GHS {previewCosts.eLevy.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-800 pt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-300">Estimated total debit</span>
                  <span className="text-ghana-gold font-semibold">GHS {previewCosts.estimatedTotalDebit.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">E‑Levy estimate</span>
                  <ELevyToggle checked={includeELevy} onChange={setInclude} size="sm" />
                </div>
              </div>
            )}
          </div>

          {/* Seller MoMo Number */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Seller's MoMo Number
            </label>
            <input
              type="tel"
              name="sellerMoMo"
              value={formData.sellerMoMo}
              onChange={handleChange}
              placeholder="0XX XXX XXXX"
              className={`w-full bg-charcoal/50 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:border-transparent ${
                errors.sellerMoMo ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            {errors.sellerMoMo && (
              <p className="text-red-400 text-xs mt-1">{errors.sellerMoMo}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              The seller will receive payment once you confirm receipt
            </p>
          </div>

          {/* Buyer Email */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Your Email (for Paystack receipt)
            </label>
            <input
              type="email"
              name="buyerEmail"
              value={formData.buyerEmail}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full bg-charcoal/50 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:border-transparent ${
                errors.buyerEmail ? 'border-red-500' : 'border-gray-700'
              }`}
            />
            {errors.buyerEmail && (
              <p className="text-red-400 text-xs mt-1">{errors.buyerEmail}</p>
            )}
          </div>

          {/* Security Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-ghana-gold/10 border border-ghana-gold/30 rounded-xl p-4 flex items-start gap-3"
          >
            <Shield className="w-5 h-5 text-ghana-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-200 font-medium mb-1">Secure Escrow Protection</p>
              <p className="text-xs text-gray-400">
                Funds will be held securely until you confirm the item is received. 
                The seller cannot access the funds until you approve.
              </p>
            </div>
          </motion.div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`w-full bg-ghana-gold text-deep-black font-bold py-4 rounded-xl shadow-lg shadow-ghana-gold/20 flex items-center justify-center gap-2 mt-8 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            <Lock className="w-5 h-5" />
            <span>{loading ? 'Creating SafeLink…' : 'Generate SafeLink'}</span>
          </motion.button>

          {submitError && (
            <p className="text-red-400 text-xs mt-3 text-center">{submitError}</p>
          )}
        </motion.div>
      </form>
    </div>
  )
}

export default NewDealForm

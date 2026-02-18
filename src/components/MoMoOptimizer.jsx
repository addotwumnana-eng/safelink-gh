import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingUp } from 'lucide-react'
import {
  DEFAULT_E_LEVY_RATE,
  DEFAULT_SERVICE_FEE_RATE,
  calculateMoMoCosts,
} from '../utils/fees'
import ELevyToggle from './ELevyToggle'

function MoMoOptimizer({ includeELevyEstimate, onToggleELevyEstimate }) {
  const [amount, setAmount] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [localIncludeELevy, setLocalIncludeELevy] = useState(true)
  const includeELevy = typeof includeELevyEstimate === 'boolean' ? includeELevyEstimate : localIncludeELevy

  const costs = calculateMoMoCosts({
    amount: parseFloat(amount || '0'),
    serviceFeeRate: DEFAULT_SERVICE_FEE_RATE,
    eLevyRate: DEFAULT_E_LEVY_RATE,
    includeELevy,
  })

  const setInclude = (next) => {
    if (typeof includeELevyEstimate === 'boolean') {
      onToggleELevyEstimate?.(next)
    } else {
      setLocalIncludeELevy(next)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-charcoal/50 rounded-2xl p-5 border border-gray-800/50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-ghana-gold" />
          <h3 className="text-lg font-semibold text-white">MoMo Optimizer</h3>
        </div>
        <TrendingUp className="w-5 h-5 text-ghana-gold" />
      </div>

      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">
          Transaction Amount (GHS)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ghana-gold font-semibold">
            GHS
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            step="0.01"
            min="0"
            className="w-full bg-deep-black border border-gray-700 rounded-xl pl-16 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-gold focus:border-transparent"
          />
        </div>
      </div>

      {amount && parseFloat(amount) > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <div className="bg-deep-black rounded-xl p-4 border border-gray-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Amount:</span>
              <span className="text-white font-bold">GHS {costs.base.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Service fee (1%):</span>
              <span className="text-orange-400 font-medium">+GHS {costs.serviceFee.toFixed(2)}</span>
            </div>
            {includeELevy && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">E‑Levy ({Math.round(DEFAULT_E_LEVY_RATE * 100)}%):</span>
                <span className="text-orange-400 font-medium">+GHS {costs.eLevy.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-800 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">Estimated total debit:</span>
                <span className="text-ghana-gold font-bold text-lg">GHS {costs.estimatedTotalDebit.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 bg-charcoal/30 rounded-xl p-4 border border-gray-800/50">
            <div>
              <p className="text-sm text-gray-200 font-medium">E‑Levy estimate</p>
              <p className="text-xs text-gray-500 mt-0.5">Toggle to add/remove the estimate</p>
            </div>
            <ELevyToggle checked={includeELevy} onChange={setInclude} />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowDetails(!showDetails)}
            className="w-full bg-ghana-gold text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </motion.button>

          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-deep-black/50 rounded-xl p-4 border border-gray-800 text-xs text-gray-400 space-y-2"
            >
              <p>
                <strong className="text-gray-300">Service fee:</strong> 1% of the deal amount.
              </p>
              {includeELevy && (
                <p>
                  <strong className="text-gray-300">E‑Levy:</strong> Modeled at {Math.round(DEFAULT_E_LEVY_RATE * 100)}% of the deal amount.
                  Actual levy can vary by channel/provider and exemptions.
                </p>
              )}
              <p>
                <strong className="text-gray-300">Total to lock:</strong> GHS {costs.totalToLock.toFixed(2)} (amount + service fee).
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      {(!amount || parseFloat(amount) === 0) && (
        <p className="text-gray-500 text-xs text-center py-2">
          Enter an amount to calculate fees
        </p>
      )}
    </motion.div>
  )
}

export default MoMoOptimizer

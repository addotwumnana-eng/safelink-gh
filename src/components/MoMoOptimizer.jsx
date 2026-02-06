import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, TrendingUp } from 'lucide-react'

function MoMoOptimizer() {
  const [amount, setAmount] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  const SERVICE_FEE_RATE = 0.01 // 1% service fee

  const calculateFees = (transactionAmount) => {
    const amountNum = parseFloat(transactionAmount) || 0
    
    if (amountNum === 0) {
      return {
        serviceFee: 0,
        totalFees: 0,
        netAmount: 0,
        totalAmount: 0
      }
    }

    // Service fee: 1% of transaction amount
    const serviceFee = amountNum * SERVICE_FEE_RATE

    const totalFees = serviceFee
    const netAmount = amountNum - totalFees
    const totalAmount = amountNum

    return {
      serviceFee,
      totalFees,
      netAmount,
      totalAmount
    }
  }

  const fees = calculateFees(amount)

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
              <span className="text-gray-400 text-sm">Total Amount:</span>
              <span className="text-white font-bold">GHS {fees.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Service Fee:</span>
              <span className="text-orange-400 font-medium">
                -GHS {fees.serviceFee.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-gray-800 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">Net Amount:</span>
                <span className="text-ghana-gold font-bold text-lg">
                  GHS {fees.netAmount.toFixed(2)}
                </span>
              </div>
            </div>
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
                <strong className="text-gray-300">Service Fee:</strong> 1% of transaction amount.
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

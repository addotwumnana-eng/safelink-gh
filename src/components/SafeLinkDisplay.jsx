import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, CheckCircle, Shield, Lock, ExternalLink } from 'lucide-react'

function SafeLinkDisplay({ linkData, onBack, showToast }) {
  const [copied, setCopied] = useState(false)

  // Generate verifyUrl from either safeLink or id (for backend deals)
  const linkId = linkData.safeLink 
    ? linkData.safeLink.replace('safelink.gh/', '') 
    : linkData.id
  const verifyUrl = `${window.location.origin}/v/${linkId}`
  
  // Generate display link
  const displayLink = linkData.safeLink || `${window.location.origin}/v/${linkData.id}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      showToast?.('Link copied to clipboard')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getShareMessage = () => {
    const total = linkData.totalToPay ?? linkData.price
    return `Funds held in escrow for ${linkData.itemName} (GHS ${total.toFixed(2)} total). Verify: ${verifyUrl}`
  }

  const handleShareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(getShareMessage())}`
    window.location.href = url
  }

  const handleShareSMS = () => {
    const message = getShareMessage()
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (isMobile) {
      // Try to extract phone number from sellerMoMo if it looks like a phone number
      const sellerMoMo = linkData.sellerMoMo || ''
      const phoneMatch = sellerMoMo.match(/[\d+]{10,}/)
      const phoneNumber = phoneMatch ? phoneMatch[0].replace(/\D/g, '') : ''
      
      // Use sms:// with phone number if available, otherwise just body
      let smsUrl
      if (phoneNumber) {
        smsUrl = `sms://${phoneNumber}?body=${encodeURIComponent(message)}`
      } else {
        smsUrl = `sms://?body=${encodeURIComponent(message)}`
      }
      
      // Try opening SMS app
      window.location.href = smsUrl
      
      // Fallback: if it doesn't work after a short delay, copy message
      setTimeout(() => {
        if (!document.hidden) {
          // If still on page, SMS didn't open, so copy message instead
          navigator.clipboard.writeText(message).then(() => {
            showToast?.('SMS message copied to clipboard')
          }).catch(() => {
            showToast?.('Please copy the message manually')
          })
        }
      }, 500)
    } else {
      // Desktop: copy message to clipboard since SMS won't work
      navigator.clipboard.writeText(message).then(() => {
        showToast?.('SMS message copied to clipboard (paste into your SMS app)')
      }).catch(() => {
        showToast?.('Please copy the message manually')
      })
    }
  }
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
            <h2 className="text-2xl font-bold text-ghana-gold">SafeLink Generated</h2>
            <p className="text-gray-400 text-sm mt-1">Share this link with the seller</p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-8 space-y-6">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 bg-ghana-gold/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-ghana-gold" />
          </div>
        </motion.div>

        {/* Deal Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-charcoal/50 rounded-2xl p-6 border border-gray-800/50"
        >
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Deal Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Item:</span>
              <span className="text-white font-medium">{linkData.itemName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Price:</span>
              <span className="text-white font-bold">GHS {linkData.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Service fee (1%):</span>
              <span className="text-orange-400 font-medium">GHS {(linkData.serviceFee ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total to pay:</span>
              <span className="text-white font-bold text-lg">GHS {(linkData.totalToPay ?? linkData.price).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Seller MoMo:</span>
              <span className="text-white font-medium">{linkData.sellerMoMo}</span>
            </div>
          </div>
        </motion.div>

        {/* SafeLink Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-ghana-gold/10 border border-ghana-gold/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-ghana-gold" />
            <h3 className="text-lg font-semibold text-ghana-gold">Your SafeLink</h3>
          </div>
          
          <div className="bg-deep-black rounded-xl p-4 mb-4 border border-ghana-gold/20">
            <p className="text-ghana-gold font-mono text-sm break-all">{displayLink}</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopy}
            className="w-full bg-ghana-gold text-deep-black font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                <span>Copy Link</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-charcoal/30 rounded-xl p-5 border border-gray-800/50"
        >
          <div className="flex items-start gap-3 mb-3">
            <Lock className="w-5 h-5 text-ghana-gold flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-gray-200 mb-2">How it works:</h4>
              <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
                <li>Share this SafeLink with the seller</li>
                <li>The seller can verify that funds are held in escrow</li>
                <li>Once you receive the item, confirm in your dashboard</li>
                <li>Funds will be released to the seller automatically</li>
              </ol>
            </div>
          </div>
        </motion.div>

        {/* Share Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShareWhatsApp}
            className="flex-1 bg-charcoal/50 border border-gray-700 rounded-xl py-3 flex items-center justify-center gap-2 text-gray-300 hover:border-ghana-gold/50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">Share via WhatsApp</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShareSMS}
            className="flex-1 bg-charcoal/50 border border-gray-700 rounded-xl py-3 flex items-center justify-center gap-2 text-gray-300 hover:border-ghana-gold/50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="text-sm">Share via SMS</span>
          </motion.button>
        </motion.div>

        {/* Back to Dashboard */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="w-full bg-charcoal/50 border border-gray-700 text-white font-medium py-3 rounded-xl mt-4 hover:border-ghana-gold/50 transition-colors"
        >
          Back to Dashboard
        </motion.button>
      </div>
    </div>
  )
}

export default SafeLinkDisplay

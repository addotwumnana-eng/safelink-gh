import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, onClose, duration])

  if (!message) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-charcoal border border-ghana-gold/40 text-white px-4 py-3 rounded-xl shadow-lg"
    >
      <CheckCircle className="w-5 h-5 text-ghana-gold flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  )
}

export default Toast

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, CheckCircle, XCircle, AlertTriangle, Lock } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

function VerifyPage() {
  const { linkId } = useParams()
  const [deal, setDeal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        // Try to fetch by ID (linkId might be the deal ID)
        const res = await fetch(`${API_BASE}/api/deals/${linkId}`)
        if (res.ok) {
          const data = await res.json()
          setDeal(data)
        } else {
          // If not found by ID, try to find by safeLink in all deals
          const allDealsRes = await fetch(`${API_BASE}/api/deals`)
          if (allDealsRes.ok) {
            const allDeals = await allDealsRes.json()
            const found = allDeals.find((d) => 
              d.safeLink === `safelink.gh/${linkId}` || 
              d.id === linkId ||
              (d.safeLink && d.safeLink.includes(linkId))
            )
            setDeal(found || null)
          }
        }
      } catch (err) {
        console.error('Error fetching deal:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDeal()
  }, [linkId])

  if (!deal) {
    return (
      <div className="min-h-screen bg-deep-black text-white flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-charcoal/50 rounded-2xl p-8 border border-gray-800/50 max-w-sm w-full text-center"
        >
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link not found</h1>
          <p className="text-gray-400 text-sm">This link may be invalid or expired.</p>
          <Link
            to="/"
            className="mt-6 inline-block text-ghana-gold text-sm font-medium hover:underline"
          >
            SafeLink Ghana
          </Link>
        </motion.div>
      </div>
    )
  }

  const amount = deal.totalToPay ?? deal.price
  const status = deal.status

  const getStatusContent = () => {
    if (status === 'completed') {
      return {
        icon: CheckCircle,
        iconClass: 'text-green-400',
        title: 'Deal complete',
        message: 'Funds have been released to the seller.',
      }
    }
    if (status === 'cancelled') {
      return {
        icon: XCircle,
        iconClass: 'text-red-400',
        title: 'Deal cancelled',
        message: 'This deal was cancelled. Funds were returned to the buyer.',
      }
    }
    if (status === 'disputed') {
      return {
        icon: AlertTriangle,
        iconClass: 'text-amber-400',
        title: 'Under dispute',
        message: 'This deal is under dispute. Funds are held in escrow until resolved.',
      }
    }
    // active
    return {
      icon: Shield,
      iconClass: 'text-ghana-gold',
      title: 'Funds held in escrow',
      message: 'The buyer has secured this amount. Funds will be released to you when the buyer confirms receipt.',
    }
  }

  const { icon: Icon, iconClass, title, message } = getStatusContent()

  return (
    <div className="min-h-screen bg-deep-black text-white px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto"
      >
        <div className="flex items-center gap-2 mb-8">
          <Shield className="w-8 h-8 text-ghana-gold" />
          <h1 className="text-xl font-bold" style={{ color: '#FFD700' }}>SafeLink Ghana</h1>
        </div>

        <div className="bg-charcoal/50 rounded-2xl p-6 border border-gray-800/50">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-charcoal flex items-center justify-center border border-gray-700">
              <Icon className={`w-10 h-10 ${iconClass}`} />
            </div>
          </div>
          <h2 className="text-lg font-bold text-white text-center mb-2">{title}</h2>
          <p className="text-gray-400 text-sm text-center mb-6">{message}</p>

          <div className="bg-deep-black/50 rounded-xl p-4 border border-gray-800 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Item</span>
              <span className="text-white font-medium">{deal.itemName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Amount secured</span>
              <span className="text-ghana-gold font-bold">GHS {amount.toFixed(2)}</span>
            </div>
          </div>

          {(status === 'paid' || status === 'active' || status === 'disputed' || status === 'pending_payment') && (
            <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>You can safely ship. Funds are held by SafeLink until the buyer confirms receipt.</span>
            </div>
          )}
        </div>

        <Link
          to="/"
          className="mt-6 block text-center text-ghana-gold text-sm font-medium hover:underline"
        >
          SafeLink Ghana
        </Link>
      </motion.div>
    </div>
  )
}

export default VerifyPage

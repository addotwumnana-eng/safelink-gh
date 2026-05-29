import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Globe,
  Send,
  ShieldAlert,
  Smartphone,
} from 'lucide-react'
import { getApiBaseUrl } from './utils/apiBase'

const API_BASE = getApiBaseUrl()
const DEVICE_ID_KEY = 'scamshield_device_id'
const PAYMENT_EMAIL_KEY = 'scamshield_payment_email'

const tabs = [
  { id: 'url', label: 'Scan URL', icon: Globe },
  { id: 'app', label: 'Check App', icon: Smartphone },
  { id: 'report', label: 'Report Scam', icon: ShieldAlert },
  { id: 'subscription', label: 'Plans', icon: Crown },
]

const planCards = [
  {
    id: 'free',
    title: 'Freemium',
    price: 'GHS 0',
    subtitle: '1 scan/day',
    detail: 'Basic scam detection with one check daily.',
  },
  {
    id: 'weekly',
    title: 'Weekly Unlimited',
    price: 'GHS 5',
    subtitle: 'per week',
    detail: 'Unlimited URL and app checks for seven days.',
  },
  {
    id: 'monthly',
    title: 'Monthly Unlimited',
    price: 'GHS 15',
    subtitle: 'per month',
    detail: 'Unlimited checks for 30 days at the lowest price.',
  },
]

function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing

    const generated =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`

    localStorage.setItem(DEVICE_ID_KEY, generated)
    return generated
  } catch {
    return 'device-fallback'
  }
}

function getSavedPaymentEmail() {
  try {
    return localStorage.getItem(PAYMENT_EMAIL_KEY) || ''
  } catch {
    return ''
  }
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function getFriendlyNetworkError(error) {
  const raw = String(error?.message || '').toLowerCase()
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) {
    return `Cannot reach backend (${API_BASE}). Start backend server or set VITE_API_BASE_URL correctly.`
  }
  return error?.message || 'Something went wrong. Try again.'
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const contentType = response.headers.get('content-type') || ''

  let payload
  if (contentType.includes('application/json')) {
    payload = await response.json()
  } else {
    const text = await response.text()
    payload = { error: text || 'Unexpected response from server' }
  }

  return { response, payload }
}

function Badge({ verdict }) {
  const mapping = {
    safe: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    suspicious: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    dangerous: 'bg-red-500/20 text-red-300 border-red-400/30',
    invalid: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
  }

  const label = verdict ? verdict.toUpperCase() : 'UNKNOWN'
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${mapping[verdict] || mapping.invalid}`}>
      {label}
    </span>
  )
}

function ResultCard({ title, result }) {
  if (!result) return null

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-charcoal/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm text-gray-300 font-semibold">{title}</h3>
        <Badge verdict={result.verdict} />
      </div>
      <div className="mt-3 text-sm text-gray-200">
        Risk score: <span className="font-bold text-ghana-gold">{result.riskScore}/100</span>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-gray-300 list-disc list-inside">
        {(result.reasons || []).map((reason, idx) => (
          <li key={`${reason}-${idx}`}>{reason}</li>
        ))}
      </ul>
    </div>
  )
}

function SubscriptionSummary({ subscription }) {
  if (!subscription) return null

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
      <p className="text-gray-300">
        Plan: <span className="font-bold text-ghana-gold">{subscription.planLabel}</span>
      </p>
      {subscription.unlimited ? (
        <p className="text-emerald-300 mt-1">Unlimited scans active</p>
      ) : (
        <p className="text-amber-300 mt-1">
          Remaining today: {subscription.scansRemainingToday}/{subscription.todayLimit}
        </p>
      )}
      {subscription.expiresAt && (
        <p className="text-gray-400 mt-1">Expires: {formatDate(subscription.expiresAt)}</p>
      )}
    </div>
  )
}

function UrlScanPanel({ deviceId, subscription, onSubscriptionChange, onUpgradeRequest }) {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    setResult(null)

    try {
      const { response, payload } = await requestJson(`${API_BASE}/api/scan/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ url, deviceId }),
      })

      if (payload.subscription) onSubscriptionChange(payload.subscription)
      if (!response.ok) {
        if (payload.code === 'FREE_LIMIT_REACHED') {
          setError('Daily free scan finished. Upgrade to weekly/monthly for unlimited checks.')
          return
        }
        throw new Error(payload.error || 'Scan failed')
      }
      setResult(payload)
    } catch (scanError) {
      setError(getFriendlyNetworkError(scanError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <SubscriptionSummary subscription={subscription} />
      <label className="text-sm text-gray-300">Paste website URL</label>
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://example.com/login"
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      />
      <button
        disabled={loading}
        className="w-full rounded-xl bg-ghana-gold text-black font-semibold py-3 disabled:opacity-60"
      >
        {loading ? 'Scanning...' : 'Scan URL'}
      </button>
      {error && (
        <div className="text-sm text-red-300">
          <p>{error}</p>
          {subscription && !subscription.unlimited && (
            <button
              type="button"
              onClick={onUpgradeRequest}
              className="mt-2 text-ghana-gold font-semibold hover:underline"
            >
              Upgrade now
            </button>
          )}
        </div>
      )}
      <ResultCard title="URL analysis" result={result} />
    </form>
  )
}

function AppCheckPanel({ deviceId, subscription, onSubscriptionChange, onUpgradeRequest }) {
  const [appName, setAppName] = useState('')
  const [packageName, setPackageName] = useState('')
  const [developerName, setDeveloperName] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    setResult(null)

    try {
      const { response, payload } = await requestJson(`${API_BASE}/api/scan/app`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ appName, packageName, developerName, deviceId }),
      })

      if (payload.subscription) onSubscriptionChange(payload.subscription)
      if (!response.ok) {
        if (payload.code === 'FREE_LIMIT_REACHED') {
          setError('Daily free scan finished. Upgrade to weekly/monthly for unlimited checks.')
          return
        }
        throw new Error(payload.error || 'Check failed')
      }
      setResult(payload)
    } catch (checkError) {
      setError(getFriendlyNetworkError(checkError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <SubscriptionSummary subscription={subscription} />
      <label className="text-sm text-gray-300">App name</label>
      <input
        value={appName}
        onChange={(event) => setAppName(event.target.value)}
        placeholder="MTN MoMo"
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      />

      <label className="text-sm text-gray-300">Package name</label>
      <input
        value={packageName}
        onChange={(event) => setPackageName(event.target.value)}
        placeholder="com.example.app"
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      />

      <label className="text-sm text-gray-300">Developer name</label>
      <input
        value={developerName}
        onChange={(event) => setDeveloperName(event.target.value)}
        placeholder="Official Developer Ltd"
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      />

      <button
        disabled={loading}
        className="w-full rounded-xl bg-ghana-gold text-black font-semibold py-3 disabled:opacity-60"
      >
        {loading ? 'Checking...' : 'Check App'}
      </button>
      {error && (
        <div className="text-sm text-red-300">
          <p>{error}</p>
          {subscription && !subscription.unlimited && (
            <button
              type="button"
              onClick={onUpgradeRequest}
              className="mt-2 text-ghana-gold font-semibold hover:underline"
            >
              Upgrade now
            </button>
          )}
        </div>
      )}
      <ResultCard title="App authenticity check" result={result} />
    </form>
  )
}

function ReportPanel() {
  const [type, setType] = useState('url')
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setStatus('')
    setLoading(true)

    try {
      const { response, payload } = await requestJson(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value, description, contact }),
      })
      if (!response.ok) throw new Error(payload.error || 'Report failed')

      setStatus('Thanks. Report submitted for review.')
      setValue('')
      setDescription('')
      setContact('')
    } catch (submitError) {
      setError(getFriendlyNetworkError(submitError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="text-sm text-gray-300">Report type</label>
      <select
        value={type}
        onChange={(event) => setType(event.target.value)}
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      >
        <option value="url">Fake website URL</option>
        <option value="app">Fake mobile app</option>
      </select>

      <label className="text-sm text-gray-300">URL / app details</label>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={type === 'url' ? 'https://suspicious-site.com' : 'App name or package'}
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      />

      <label className="text-sm text-gray-300">What happened?</label>
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={4}
        placeholder="Describe the scam attempt"
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      />

      <label className="text-sm text-gray-300">Your contact (optional)</label>
      <input
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        placeholder="Email or phone"
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
      />

      <button
        disabled={loading}
        className="w-full rounded-xl bg-ghana-gold text-black font-semibold py-3 disabled:opacity-60"
      >
        {loading ? 'Sending...' : 'Send Report'}
      </button>

      {status && <p className="text-emerald-300 text-sm">{status}</p>}
      {error && <p className="text-red-300 text-sm">{error}</p>}
    </form>
  )
}

function PlansPanel({
  subscription,
  loading,
  activatingPlanId,
  onActivatePlan,
  paymentEmail,
  onPaymentEmailChange,
  paystackConfigured,
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-gray-300">
        <p>
          Current plan: <span className="text-ghana-gold font-bold">{subscription?.planLabel || '-'}</span>
        </p>
        {subscription?.unlimited ? (
          <p className="text-emerald-300 mt-1">Unlimited checks active</p>
        ) : (
          <p className="text-amber-300 mt-1">
            Free scans left today: {subscription?.scansRemainingToday ?? 0}
          </p>
        )}
        {subscription?.expiresAt && (
          <p className="text-gray-400 mt-1">Expires: {formatDate(subscription.expiresAt)}</p>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-charcoal/60 p-4">
        <label className="text-sm text-gray-300">Paystack payment email</label>
        <input
          type="email"
          value={paymentEmail}
          onChange={(event) => onPaymentEmailChange(event.target.value)}
          placeholder="you@example.com"
          className="mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-ghana-gold"
        />
        {!paystackConfigured && (
          <p className="text-xs text-amber-300 mt-2">
            Paystack is not configured on backend yet. Add PAYSTACK_SECRET_KEY to backend `.env`.
          </p>
        )}
      </div>

      {planCards.map((plan) => {
        const isCurrent = subscription?.planId === plan.id
        const isPaidPlan = plan.id !== 'free'
        return (
          <div key={plan.id} className="rounded-xl border border-white/10 bg-charcoal/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white">{plan.title}</h3>
                <p className="text-sm text-gray-400">{plan.detail}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-ghana-gold">{plan.price}</p>
                <p className="text-xs text-gray-400">{plan.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              disabled={!isPaidPlan || isCurrent || loading || activatingPlanId === plan.id}
              onClick={() => onActivatePlan(plan.id)}
              className="mt-3 w-full rounded-xl bg-ghana-gold text-black font-semibold py-2.5 disabled:opacity-55"
            >
              {isCurrent
                ? 'Current plan'
                : activatingPlanId === plan.id
                  ? 'Opening Paystack...'
                  : isPaidPlan
                    ? `Pay with Paystack (${plan.price})`
                    : 'Default plan'}
            </button>
          </div>
        )
      })}
      <p className="text-xs text-gray-500">
        Weekly plan costs GHS 5 and monthly plan costs GHS 15. Both unlock unlimited daily scans.
      </p>
    </div>
  )
}

function ScamShieldApp() {
  const [tab, setTab] = useState('url')
  const [deviceId] = useState(() => getOrCreateDeviceId())
  const [paymentEmail, setPaymentEmail] = useState(() => getSavedPaymentEmail())
  const [subscription, setSubscription] = useState(null)
  const [paystackConfigured, setPaystackConfigured] = useState(false)
  const [loadingSubscription, setLoadingSubscription] = useState(true)
  const [subscriptionError, setSubscriptionError] = useState('')
  const [activatingPlanId, setActivatingPlanId] = useState('')
  const [paymentNotice, setPaymentNotice] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(PAYMENT_EMAIL_KEY, paymentEmail)
    } catch {
      // ignore storage errors
    }
  }, [paymentEmail])

  const loadSubscription = useCallback(async () => {
    setSubscriptionError('')
    setLoadingSubscription(true)
    try {
      const { response, payload } = await requestJson(
        `${API_BASE}/api/subscription/status?deviceId=${encodeURIComponent(deviceId)}`,
        { headers: { 'x-device-id': deviceId } }
      )
      if (!response.ok) throw new Error(payload.error || 'Failed to load subscription')
      setSubscription(payload.subscription)
      setPaystackConfigured(Boolean(payload.paystackConfigured))
    } catch (error) {
      setSubscriptionError(getFriendlyNetworkError(error))
    } finally {
      setLoadingSubscription(false)
    }
  }, [deviceId])

  const verifyPaystackReference = useCallback(async (reference) => {
    try {
      setSubscriptionError('')
      setPaymentNotice('Verifying Paystack payment...')
      const { response, payload } = await requestJson(`${API_BASE}/api/subscription/paystack/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ reference }),
      })

      if (!response.ok) throw new Error(payload.error || 'Payment verification failed')
      setSubscription(payload.subscription)
      setTab('subscription')
      setPaymentNotice('Payment successful. Subscription activated.')
      await loadSubscription()
    } catch (error) {
      setPaymentNotice('')
      setSubscriptionError(getFriendlyNetworkError(error))
    }
  }, [deviceId, loadSubscription])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const reference = searchParams.get('reference') || searchParams.get('trxref')
    if (!reference) return

    verifyPaystackReference(reference)
    window.history.replaceState({}, '', window.location.pathname)
  }, [verifyPaystackReference])

  const handleActivatePlan = async (planId) => {
    setSubscriptionError('')
    setPaymentNotice('')
    if (!paymentEmail || !paymentEmail.includes('@')) {
      setSubscriptionError('Enter a valid payment email before continuing to Paystack.')
      return
    }

    setActivatingPlanId(planId)
    try {
      const { response, payload } = await requestJson(`${API_BASE}/api/subscription/paystack/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        body: JSON.stringify({ deviceId, planId, email: paymentEmail }),
      })

      if (!response.ok) throw new Error(payload.error || 'Could not start Paystack payment')
      if (!payload.authorizationUrl) throw new Error('No Paystack authorization URL returned')

      window.location.assign(payload.authorizationUrl)
    } catch (error) {
      setSubscriptionError(getFriendlyNetworkError(error))
      setActivatingPlanId('')
    }
  }

  const handleSubscriptionChange = useCallback((nextSubscription) => {
    if (!nextSubscription) return
    setSubscription(nextSubscription)
  }, [])

  const activePanel = useMemo(() => {
    if (tab === 'url') {
      return (
        <UrlScanPanel
          deviceId={deviceId}
          subscription={subscription}
          onSubscriptionChange={handleSubscriptionChange}
          onUpgradeRequest={() => setTab('subscription')}
        />
      )
    }

    if (tab === 'app') {
      return (
        <AppCheckPanel
          deviceId={deviceId}
          subscription={subscription}
          onSubscriptionChange={handleSubscriptionChange}
          onUpgradeRequest={() => setTab('subscription')}
        />
      )
    }

    if (tab === 'report') {
      return <ReportPanel />
    }

    return (
      <PlansPanel
        subscription={subscription}
        loading={loadingSubscription}
        activatingPlanId={activatingPlanId}
        onActivatePlan={handleActivatePlan}
        paymentEmail={paymentEmail}
        onPaymentEmailChange={setPaymentEmail}
        paystackConfigured={paystackConfigured}
      />
    )
  }, [
    activatingPlanId,
    deviceId,
    handleSubscriptionChange,
    loadingSubscription,
    paymentEmail,
    paystackConfigured,
    subscription,
    tab,
  ])

  return (
    <div className="min-h-screen bg-deep-black text-white px-4 py-6">
      <div className="mobile-container space-y-5">
        <header className="rounded-2xl bg-charcoal/60 border border-white/10 p-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-ghana-gold" />
            <div>
              <h1 className="text-lg font-bold">ScamShield Ghana</h1>
              <p className="text-xs text-gray-400">Detect fake websites and apps before you pay.</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 p-2 text-center">
              <p className="text-xs text-gray-400">Checks</p>
              <p className="font-bold text-ghana-gold">URL + App</p>
            </div>
            <div className="rounded-xl border border-white/10 p-2 text-center">
              <p className="text-xs text-gray-400">Freemium</p>
              <p className="font-bold text-amber-300">1/day</p>
            </div>
            <div className="rounded-xl border border-white/10 p-2 text-center">
              <p className="text-xs text-gray-400">Unlimited</p>
              <p className="font-bold text-emerald-300">GHS 5 / GHS 15</p>
            </div>
          </div>
          {subscription && (
            <div className="mt-3 text-xs text-gray-400">
              Plan:{' '}
              <span className="text-ghana-gold font-semibold">{subscription.planLabel}</span>
              {!subscription.unlimited && (
                <span className="ml-2">
                  ({subscription.scansRemainingToday}/{subscription.todayLimit} scans left today)
                </span>
              )}
            </div>
          )}
          {paymentNotice && <p className="mt-2 text-xs text-emerald-300">{paymentNotice}</p>}
          {subscriptionError && <p className="mt-2 text-xs text-red-300">{subscriptionError}</p>}
        </header>

        <nav className="grid grid-cols-4 gap-2">
          {tabs.map((item) => {
            const Icon = item.icon
            const active = item.id === tab
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-xl border px-2 py-3 text-xs font-semibold flex flex-col items-center gap-1 ${
                  active
                    ? 'bg-ghana-gold text-black border-ghana-gold'
                    : 'bg-charcoal/40 text-gray-300 border-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <section className="rounded-2xl border border-white/10 bg-charcoal/40 p-4">
          {activePanel}
        </section>

        <footer className="text-xs text-gray-500 text-center space-y-1 pb-4">
          <p className="flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Scam checks are best-effort and not a legal guarantee.
          </p>
          <p className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Always confirm sender identity before payment.
          </p>
          <p className="flex items-center justify-center gap-1">
            <Send className="w-3 h-3" />
            Paid plans: GHS 5 weekly unlimited, GHS 15 monthly unlimited.
          </p>
        </footer>
      </div>
    </div>
  )
}

export default ScamShieldApp

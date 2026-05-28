import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Globe, ShieldAlert, Smartphone, Send } from 'lucide-react'
import { getApiBaseUrl } from './utils/apiBase'

const API_BASE = getApiBaseUrl()

const tabs = [
  { id: 'url', label: 'Scan URL', icon: Globe },
  { id: 'app', label: 'Check App', icon: Smartphone },
  { id: 'report', label: 'Report Scam', icon: ShieldAlert },
]

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

function UrlScanPanel() {
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
      const response = await fetch(`${API_BASE}/api/scan/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Scan failed')
      setResult(payload)
    } catch (scanError) {
      setError(scanError.message || 'Could not scan URL')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
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
      {error && <p className="text-red-300 text-sm">{error}</p>}
      <ResultCard title="URL analysis" result={result} />
    </form>
  )
}

function AppCheckPanel() {
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
      const response = await fetch(`${API_BASE}/api/scan/app`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, packageName, developerName }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Check failed')
      setResult(payload)
    } catch (checkError) {
      setError(checkError.message || 'Could not verify app')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
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
      {error && <p className="text-red-300 text-sm">{error}</p>}
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
      const response = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value, description, contact }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Report failed')

      setStatus('Thanks. Report submitted for review.')
      setValue('')
      setDescription('')
      setContact('')
    } catch (submitError) {
      setError(submitError.message || 'Could not submit report')
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

function ScamShieldApp() {
  const [tab, setTab] = useState('url')

  const ActivePanel = useMemo(() => {
    if (tab === 'app') return AppCheckPanel
    if (tab === 'report') return ReportPanel
    return UrlScanPanel
  }, [tab])

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
              <p className="text-xs text-gray-400">Mode</p>
              <p className="font-bold text-amber-300">Low-cost MVP</p>
            </div>
            <div className="rounded-xl border border-white/10 p-2 text-center">
              <p className="text-xs text-gray-400">Action</p>
              <p className="font-bold text-emerald-300">Report scams</p>
            </div>
          </div>
        </header>

        <nav className="grid grid-cols-3 gap-2">
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
          <ActivePanel />
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
            Publish to Play Store after policy and privacy review.
          </p>
        </footer>
      </div>
    </div>
  )
}

export default ScamShieldApp

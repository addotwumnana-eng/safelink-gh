import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import scanRouter from './routes/scan.js'
import reportsRouter from './routes/reports.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://0.0.0.0:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    const isPrivateHostname = (hostname) =>
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)

    const isLocalDev = (() => {
      if (typeof origin !== 'string') return false
      try {
        const u = new URL(origin)
        return (u.protocol === 'http:' || u.protocol === 'https:') && isPrivateHostname(u.hostname)
      } catch {
        return false
      }
    })()

    if (!origin || allowedOrigins.includes(origin) || isLocalDev) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
}))

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

app.get('/api/test', (_req, res) => {
  res.json({ message: 'ScamShield backend is running' })
})

app.use('/api/scan', scanRouter)
app.use('/api/reports', reportsRouter)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`)
})

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dealsRouter from './routes/deals.js'

dotenv.config()

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://0.0.0.0:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
].filter(Boolean)

function isPrivateHostname(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  )
}

export function createApp() {
  const app = express()

  app.use(cors({
    origin: (origin, cb) => {
      // Allow common local dev origins (Vite may use different ports/hosts).
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

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() })
  })

  // Simple test route (still useful for debugging)
  app.get('/api/test', (req, res) => {
    res.json({ message: 'SafeLink backend is running' })
  })

  // Deals / escrow routes
  app.use('/api/deals', dealsRouter)

  return app
}

const app = createApp()

export default app

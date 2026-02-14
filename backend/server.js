import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dealsRouter from './routes/deals.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow common local dev origins (Vite may use different ports/hosts).
    const isLocalDev =
      typeof origin === 'string' &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`)
})
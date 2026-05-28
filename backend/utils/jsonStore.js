import fs from 'fs/promises'
import path from 'path'

async function ensureFile(filePath, defaultValue) {
  const resolvedPath = path.resolve(filePath)
  const dir = path.dirname(resolvedPath)

  await fs.mkdir(dir, { recursive: true })

  try {
    await fs.access(resolvedPath)
  } catch {
    await fs.writeFile(resolvedPath, JSON.stringify(defaultValue, null, 2), 'utf8')
  }

  return resolvedPath
}

export async function readJsonFile(filePath, defaultValue = []) {
  const resolvedPath = await ensureFile(filePath, defaultValue)
  const raw = await fs.readFile(resolvedPath, 'utf8')

  try {
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

export async function writeJsonFile(filePath, payload) {
  const resolvedPath = await ensureFile(filePath, [])
  await fs.writeFile(resolvedPath, JSON.stringify(payload, null, 2), 'utf8')
}

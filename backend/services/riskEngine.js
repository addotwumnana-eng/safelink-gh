const suspiciousTlds = new Set([
  'zip',
  'top',
  'xyz',
  'click',
  'live',
  'gq',
  'tk',
  'cf',
  'ml',
  'work',
])

const suspiciousPathFragments = [
  'verify',
  'wallet',
  'momo',
  'secure',
  'login',
  'update',
  'claim',
  'otp',
  'pin',
  'payment',
]

const suspiciousQueryFragments = [
  'redirect=',
  'next=',
  'callback=',
  'token=',
  'session=',
  'password=',
]

function normalizeDomain(rawDomain = '') {
  return String(rawDomain).trim().toLowerCase().replace(/^www\./, '')
}

function getDomainFromUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { error: 'Only http/https URLs are supported.' }
    }

    return {
      hostname: normalizeDomain(parsed.hostname),
      pathname: parsed.pathname.toLowerCase(),
      search: parsed.search.toLowerCase(),
      raw: parsed.toString(),
      tld: normalizeDomain(parsed.hostname).split('.').at(-1) || '',
    }
  } catch {
    return { error: 'Invalid URL format.' }
  }
}

function levenshteinDistance(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const matrix = Array.from({ length: b.length + 1 }, () => [])

  for (let i = 0; i <= b.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[b.length][a.length]
}

function mapScoreToVerdict(score) {
  if (score >= 70) return 'dangerous'
  if (score >= 35) return 'suspicious'
  return 'safe'
}

function scoreMatch(domain, brandDomains = []) {
  const normalizedBrandDomains = brandDomains.map((candidate) => normalizeDomain(candidate))
  const domainParts = domain.split('.')
  const secondLevel = domainParts.length >= 2 ? domainParts.slice(-2).join('.') : domain

  for (const official of normalizedBrandDomains) {
    const officialParts = official.split('.')
    const officialSecondLevel =
      officialParts.length >= 2 ? officialParts.slice(-2).join('.') : official

    if (domain === official || domain.endsWith(`.${official}`)) {
      return { type: 'exact', score: 0, matchedDomain: official }
    }

    if (domain.includes(officialSecondLevel.replace('.', ''))) {
      return { type: 'lookalike', score: 28, matchedDomain: official }
    }

    const distance = levenshteinDistance(secondLevel, officialSecondLevel)
    if (distance > 0 && distance <= 2) {
      return { type: 'lookalike', score: 30 - distance * 5, matchedDomain: official }
    }
  }

  return { type: 'none', score: 0 }
}

export function analyzeWebsite(rawUrl, options = {}) {
  const {
    blockedDomains = [],
    trustedBrands = [],
  } = options

  const parsed = getDomainFromUrl(rawUrl)
  if (parsed.error) {
    return {
      verdict: 'invalid',
      riskScore: 100,
      confidence: 'high',
      reasons: [parsed.error],
      normalizedUrl: null,
      matchedBrand: null,
    }
  }

  const blockedSet = new Set(blockedDomains.map((domain) => normalizeDomain(domain)))
  let riskScore = 0
  const reasons = []
  let matchedBrand = null

  if (blockedSet.has(parsed.hostname)) {
    riskScore += 90
    reasons.push('This domain is in the community/research blacklist.')
  }

  if (parsed.hostname.includes('xn--')) {
    riskScore += 30
    reasons.push('Domain uses punycode characters often abused for lookalike attacks.')
  }

  if (suspiciousTlds.has(parsed.tld)) {
    riskScore += 15
    reasons.push(`Top-level domain .${parsed.tld} is frequently used in scam campaigns.`)
  }

  const hasSuspiciousPath = suspiciousPathFragments.some((word) => parsed.pathname.includes(word))
  if (hasSuspiciousPath) {
    riskScore += 12
    reasons.push('URL path contains credential/payment bait keywords.')
  }

  const hasSuspiciousQuery = suspiciousQueryFragments.some((fragment) => parsed.search.includes(fragment))
  if (hasSuspiciousQuery) {
    riskScore += 10
    reasons.push('URL query contains redirect/session style parameters used in phishing links.')
  }

  for (const brand of trustedBrands) {
    const match = scoreMatch(parsed.hostname, brand.officialDomains || [])
    if (match.type === 'exact') {
      matchedBrand = brand.brand
      riskScore = Math.max(0, riskScore - 18)
      reasons.push(`Domain matches official ${brand.brand} web domains.`)
      break
    }

    if (match.type === 'lookalike') {
      matchedBrand = brand.brand
      riskScore += match.score
      reasons.push(`Domain appears similar to ${brand.brand} (${match.matchedDomain}).`)
      break
    }
  }

  riskScore = Math.max(0, Math.min(100, riskScore))
  const verdict = mapScoreToVerdict(riskScore)
  const confidence = riskScore >= 70 || riskScore <= 15 ? 'high' : 'medium'

  if (!reasons.length) {
    reasons.push('No known red flags were detected from local checks.')
  }

  return {
    verdict,
    riskScore,
    confidence,
    reasons,
    normalizedUrl: parsed.raw,
    matchedBrand,
  }
}

export function analyzeAppIdentity(input = {}, trustedBrands = []) {
  const appName = String(input.appName || '').trim()
  const packageName = String(input.packageName || '').trim().toLowerCase()
  const developerName = String(input.developerName || '').trim().toLowerCase()

  if (!appName && !packageName) {
    return {
      verdict: 'invalid',
      riskScore: 100,
      confidence: 'high',
      reasons: ['Provide at least app name or package name.'],
      matchedBrand: null,
    }
  }

  const lowerAppName = appName.toLowerCase()
  let riskScore = 35
  const reasons = []
  let matchedBrand = null
  let officialMatch = null

  for (const brand of trustedBrands) {
    const brandName = String(brand.brand || '').toLowerCase()
    const isBrandMatch =
      (lowerAppName && (lowerAppName.includes(brandName) || brandName.includes(lowerAppName))) ||
      (packageName && (packageName.includes(brandName.replace(/\s+/g, '')) || packageName.includes(brandName.split(' ')[0])))

    if (!isBrandMatch) continue

    matchedBrand = brand.brand
    const officialApps = brand.officialApps || []

    for (const official of officialApps) {
      const officialPackage = String(official.packageName || '').toLowerCase()
      const officialDeveloper = String(official.developerName || '').toLowerCase()
      const packageMatches = packageName && officialPackage === packageName
      const developerMatches = developerName && officialDeveloper === developerName

      if (packageMatches && (developerMatches || !developerName)) {
        officialMatch = official
        break
      }
    }

    if (officialMatch) break
  }

  if (officialMatch) {
    riskScore = 5
    reasons.push(`Package and developer align with verified ${matchedBrand} listing.`)
  } else if (matchedBrand) {
    riskScore += 30
    reasons.push(`App appears related to ${matchedBrand} but package/developer mismatch detected.`)
  } else {
    riskScore += 5
    reasons.push('App not found in verified local brand catalog; treat with caution.')
  }

  if (packageName && /(free|pro|wallet|bonus|earn|cash)/.test(packageName)) {
    riskScore += 8
    reasons.push('Package name contains high-risk bait terms.')
  }

  if (developerName && /(ltd|official|verified)/.test(developerName) && !officialMatch) {
    riskScore += 7
    reasons.push('Developer name includes trust bait keywords but is not verified.')
  }

  riskScore = Math.max(0, Math.min(100, riskScore))
  const verdict = mapScoreToVerdict(riskScore)
  const confidence = officialMatch || riskScore >= 70 ? 'high' : 'medium'

  return {
    verdict,
    riskScore,
    confidence,
    reasons,
    matchedBrand,
    officialPackage: officialMatch?.packageName || null,
  }
}

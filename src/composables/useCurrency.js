import { ref, computed, watch } from 'vue'

// ============================================================
// CONFIG
// ============================================================

const CACHE_KEY = 'kudi-fx-cache'
const REFRESH_INTERVAL = 15 * 60 * 1000 // 15 minutes
const RATE_MAX = 100_000_000
const RATE_MIN = 0

const PRIMARY_API = 'https://open.er-api.com/v6/latest'
const FALLBACK_API = 'https://api.frankfurter.app/latest'

// ============================================================
// REACTIVE STATE (Singleton)
// ============================================================

const rates = ref({})
const baseCurrency = ref('USD')
const loading = ref(false)
const error = ref(null)
const lastUpdated = ref(null)
const lastUpdatedTime = ref(null) // raw timestamp for comparison
const usingCachedRates = ref(false)
const ratesLoaded = ref(false)

// User selections persisted in localStorage
const savedFrom = localStorage.getItem('kudi-currency-from') || 'USD'
const savedTo = localStorage.getItem('kudi-currency-to') || 'XAF'

const fromCurrency = ref(savedFrom)
const toCurrency = ref(savedTo)
const amount = ref(100)

// Auto-refresh timer
let refreshTimer = null

// ============================================================
// CURRENCY DEFINITIONS
// ============================================================

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', decimals: 2 },
  { code: 'XAF', name: 'CFA Franc (Cameroon)', symbol: 'FCFA', flag: '🇨🇲', decimals: 0 },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', decimals: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', decimals: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', decimals: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬', decimals: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭', decimals: 2 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', decimals: 0 },
]

// ============================================================
// VALIDATION
// ============================================================

function validateRates(rawRates) {
  const valid = {}
  let rejected = 0

  for (const [code, rate] of Object.entries(rawRates)) {
    const num = Number(rate)
    if (isNaN(num) || num <= RATE_MIN || num > RATE_MAX) {
      console.warn(`[Kudi FX] Rejected invalid rate: ${code} = ${rate}`)
      rejected++
      continue
    }
    valid[code] = num
  }

  // Always include base
  valid[baseCurrency.value] = 1

  if (rejected > 0) {
    console.warn(`[Kudi FX] ${rejected} rate(s) rejected as invalid`)
  }

  return valid
}

// ============================================================
// CACHING
// ============================================================

function saveToCache(data) {
  try {
    const payload = {
      rates: data.rates,
      base: data.base,
      timestamp: Date.now(),
      lastUpdated: data.lastUpdated,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    console.log('[Kudi FX] Rates cached to localStorage')
  } catch (e) {
    console.warn('[Kudi FX] Failed to cache rates:', e.message)
  }
}

function loadFromCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null

    const data = JSON.parse(raw)

    // Validate cache structure
    if (!data.rates || !data.base || !data.timestamp) return null

    // Check if cache is too old (> 24 hours)
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      console.log('[Kudi FX] Cache expired (> 24h), discarding')
      return null
    }

    return data
  } catch (e) {
    console.warn('[Kudi FX] Failed to load cache:', e.message)
    return null
  }
}

// ============================================================
// FETCH RATES
// ============================================================

async function fetchFromAPI(url, base) {
  const fullUrl = url === PRIMARY_API
    ? `${PRIMARY_API}/${base}`
    : `${FALLBACK_API}?from=${base}`

  console.log(`[Kudi FX] Fetching: ${fullUrl}`)

  const response = await fetch(fullUrl)
  if (!response.ok) throw new Error(`API returned ${response.status}`)

  const data = await response.json()
  console.log('[Kudi FX] API response:', JSON.stringify(data).slice(0, 200) + '...')

  // Normalize: different APIs return different structures
  let apiRates = data.rates || {}
  const apiBase = data.base_code || data.base || base

  // Frankfurter API doesn't include XAF directly; we need to handle this
  // If XAF is missing, calculate from EUR (XAF is pegged: 1 EUR = 655.957 XAF)
  if (!apiRates['XAF'] && apiBase !== 'XAF') {
    if (apiRates['EUR']) {
      // We have EUR rate from base, so XAF = EUR rate × 655.957
      apiRates['XAF'] = apiRates['EUR'] * 655.957
    } else if (apiBase === 'EUR') {
      apiRates['XAF'] = 655.957
    }
  }

  return { rates: apiRates, base: apiBase }
}

async function fetchRates(force = false) {
  // Don't re-fetch if already loading
  if (loading.value && !force) return

  // Try cache first (unless forced)
  if (!force) {
    const cache = loadFromCache()
    if (cache && cache.rates) {
      const validated = validateRates(cache.rates)
      if (Object.keys(validated).length > 3) {
        rates.value = validated
        baseCurrency.value = cache.base || 'USD'
        lastUpdated.value = cache.lastUpdated || 'Cached'
        lastUpdatedTime.value = cache.timestamp
        usingCachedRates.value = true
        ratesLoaded.value = true
        console.log('[Kudi FX] Loaded from cache. Base:', cache.base, 'Rates:', Object.keys(validated).length)
        console.log('[Kudi FX] Sample rates: USD=XAF', validated['XAF'], 'RUB=XAF', validated['XAF'] && validated['RUB'] ? (validated['XAF'] / validated['RUB']).toFixed(4) : 'N/A')

        // Refresh if stale
        if (Date.now() - cache.timestamp > REFRESH_INTERVAL) {
          console.log('[Kudi FX] Cache stale, refreshing in background...')
          fetchRates(true)
        }
        return
      }
    }
  }

  loading.value = true
  error.value = null

  try {
    // Try primary API
    const result = await fetchFromAPI(PRIMARY_API, baseCurrency.value)
    const validated = validateRates(result.rates)

    if (Object.keys(validated).length < 3) {
      throw new Error('Too few valid rates received')
    }

    rates.value = validated
    ratesLoaded.value = true
    usingCachedRates.value = false
    lastUpdated.value = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    lastUpdatedTime.value = Date.now()

    console.log('[Kudi FX] Rates updated. Base:', baseCurrency.value)
    console.log('[Kudi FX] Key rates:', {
      EUR: validated['EUR'],
      XAF: validated['XAF'],
      RUB: validated['RUB'],
      GBP: validated['GBP'],
    })

    saveToCache({
      rates: validated,
      base: baseCurrency.value,
      lastUpdated: lastUpdated.value,
    })
  } catch (primaryErr) {
    console.warn('[Kudi FX] Primary API failed:', primaryErr.message)

    try {
      // Try fallback API
      const result = await fetchFromAPI(FALLBACK_API, baseCurrency.value)
      const validated = validateRates(result.rates)

      if (Object.keys(validated).length < 3) {
        throw new Error('Too few valid rates from fallback')
      }

      rates.value = validated
      ratesLoaded.value = true
      usingCachedRates.value = false
      lastUpdated.value = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
      lastUpdatedTime.value = Date.now()

      console.log('[Kudi FX] Fallback rates loaded. Base:', baseCurrency.value)
      console.log('[Kudi FX] Key rates:', {
        EUR: validated['EUR'],
        XAF: validated['XAF'],
        RUB: validated['RUB'],
      })

      saveToCache({
        rates: validated,
        base: baseCurrency.value,
        lastUpdated: lastUpdated.value,
      })
    } catch (fallbackErr) {
      console.warn('[Kudi FX] Fallback API also failed:', fallbackErr.message)

      // Use cache if available
      const cache = loadFromCache()
      if (cache && cache.rates) {
        const validated = validateRates(cache.rates)
        rates.value = validated
        lastUpdated.value = cache.lastUpdated || 'Cached'
        lastUpdatedTime.value = cache.timestamp
        usingCachedRates.value = true
        ratesLoaded.value = true
        error.value = 'Using last updated rates'
        console.log('[Kudi FX] Using cached rates after API failure')
      } else {
        // Final fallback: hardcoded rates
        rates.value = getOfflineRates()
        usingCachedRates.value = true
        ratesLoaded.value = true
        error.value = 'Offline mode — using estimated rates'
        console.log('[Kudi FX] Using offline fallback rates')
      }
    }
  } finally {
    loading.value = false
  }
}

function getOfflineRates() {
  // Last known approximate rates (USD base)
  return validateRates({
    USD: 1,
    EUR: 0.92,
    XAF: 607.5,
    RUB: 82.5,
    GBP: 0.79,
    JPY: 157.3,
    CNY: 7.24,
    CAD: 1.37,
    AUD: 1.53,
    NGN: 1550,
    GHS: 15.2,
    KES: 153.5,
  })
}

// ============================================================
// CONVERSION ENGINE
// ============================================================

/**
 * Convert amount from one currency to another using base rates.
 * Formula:
 *   if from === base: amount × rates[to]
 *   if to === base:   amount / rates[from]
 *   else:             (amount / rates[from]) × rates[to]
 */
function convert(amountVal, from, to) {
  const numAmount = Number(amountVal)
  if (isNaN(numAmount) || numAmount === 0) return 0

  if (from === to) return numAmount

  const fromRate = rates.value[from]
  const toRate = rates.value[to]

  if (!fromRate || !toRate) {
    if (ratesLoaded.value) {
      console.warn(`[Kudi FX] Missing rate for ${from} (${fromRate}) or ${to} (${toRate})`)
    }
    return 0
  }

  let result

  if (from === baseCurrency.value) {
    // From base: amount × rates[to]
    result = numAmount * toRate
  } else if (to === baseCurrency.value) {
    // To base: amount / rates[from]
    result = numAmount / fromRate
  } else {
    // Cross: (amount / rates[from]) × rates[to]
    result = (numAmount / fromRate) * toRate
  }

  return result
}

// ============================================================
// COMPUTED
// ============================================================

const exchangeRate = computed(() => {
  return convert(1, fromCurrency.value, toCurrency.value)
})

const convertedAmount = computed(() => {
  const result = convert(amount.value, fromCurrency.value, toCurrency.value)
  return result
})

const fromInfo = computed(() => currencies.find((c) => c.code === fromCurrency.value))
const toInfo = computed(() => currencies.find((c) => c.code === toCurrency.value))

// ============================================================
// ACTIONS
// ============================================================

function swap() {
  const temp = fromCurrency.value
  fromCurrency.value = toCurrency.value
  toCurrency.value = temp
}

function setAmount(val) {
  amount.value = val
}

function formatNumber(num, decimals) {
  const numVal = Number(num)
  if (isNaN(numVal)) return '0'

  // Auto-detect decimals from currency if not specified
  if (decimals === undefined) {
    decimals = toInfo.value?.decimals ?? 2
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numVal)
}

/**
 * Format amount with currency symbol
 */
function formatCurrency(numVal, currencyCode) {
  const info = currencies.find((c) => c.code === currencyCode)
  const decimals = info?.decimals ?? 2
  const formatted = formatNumber(numVal, decimals)
  return `${info?.symbol || currencyCode} ${formatted}`
}

// Start auto-refresh
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    console.log('[Kudi FX] Auto-refresh triggered')
    fetchRates(true)
  }, REFRESH_INTERVAL)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// Persist currency selections
watch(fromCurrency, (val) => localStorage.setItem('kudi-currency-from', val))
watch(toCurrency, (val) => localStorage.setItem('kudi-currency-to', val))

// ============================================================
// EXPORT
// ============================================================

export function useCurrency() {
  return {
    // State
    rates,
    loading,
    error,
    lastUpdated,
    usingCachedRates,
    ratesLoaded,
    fromCurrency,
    toCurrency,
    amount,
    currencies,

    // Computed
    exchangeRate,
    convertedAmount,
    fromInfo,
    toInfo,

    // Actions
    fetchRates,
    convert,
    swap,
    setAmount,
    formatNumber,
    formatCurrency,
    startAutoRefresh,
    stopAutoRefresh,
  }
}
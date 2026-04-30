import { ref } from 'vue'
import { getFinancialContext } from './useFinancialContext'
import { useFinance } from './useFinance'

// Security: OpenAI calls now go through our Supabase Edge Function proxy
// The API key lives server-side only and is never exposed to the browser.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const PROXY_URL = `${SUPABASE_URL}/functions/v1/openai-proxy`

// Cache AI insights for the day
const cachedInsights = ref(null)
const cachedDate = ref('')
const loading = ref(false)

export function useAIInsights() {
  const { state } = useFinance()

  function buildInsightPrompt() {
    const ctx = getFinancialContext()
    const today = new Date().toISOString().split('T')[0]

    return `You are a financial insights engine. Given this user's financial data, generate exactly 2 short, personalized, actionable insights.

TODAY: ${today}

FINANCIAL DATA:
- Balance: $${safeNum(ctx.balance)}
- Income: $${safeNum(ctx.totalIncome)}
- Expenses: $${safeNum(ctx.totalExpenses)}
- Savings: $${safeNum(ctx.totalSavings)} (${ctx.savingsRate}%)
- Avg daily spend: $${safeNum(ctx.avgDailySpend)}
- Days until payday: ${ctx.daysUntilPayday}
- Lowest projected balance: $${safeNum(ctx.lowestBalance)}${ctx.lowestBalanceDate ? ' on ' + ctx.lowestBalanceDate : ''}
- Upcoming income: $${safeNum(ctx.upcomingIncomeThisWeek)}
- Upcoming expenses: $${safeNum(ctx.upcomingExpensesThisWeek)}
- Subscriptions: ${ctx.activeSubscriptions || 'None'}
- Savings rules: ${ctx.activeSavings || 'None'}
- Transactions: ${ctx.transactionCount}

RULES:
- Return exactly 2 insights as a JSON array
- Each insight: { "type": "warning"|"positive"|"info", "icon": "alert"|"trend"|"tip", "text": "..." }
- Keep text under 80 characters, be specific with numbers
- Use warning type for negative situations, positive for good news, info for suggestions
- Never be generic — always reference actual numbers from the data
- Return ONLY the JSON array, no markdown or explanation`
  }

  async function fetchInsights() {
    const today = new Date().toISOString().split('T')[0]

    // Return cache if still valid
    if (cachedInsights.value && cachedDate.value === today) {
      return cachedInsights.value
    }

    if (!SUPABASE_URL) return null
    if (loading.value) return cachedInsights.value

    loading.value = true

    try {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: buildInsightPrompt() },
            { role: 'user', content: 'Generate 2 insights for this user.' },
          ],
          max_tokens: 300,
          temperature: 0.6,
        }),
      })

      if (!response.ok) throw new Error(`API ${response.status}`)

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ''

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        try {
          const insights = JSON.parse(jsonMatch[0])
          cachedInsights.value = insights
          cachedDate.value = today
          return insights
        } catch {
          // malformed JSON from AI — fall through to return null
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('AI Insights error:', err.message)
      }
    } finally {
      loading.value = false
    }

    return null
  }

  return {
    aiInsights: cachedInsights,
    aiLoading: loading,
    fetchInsights,
  }
}

function safeNum(n) {
  const num = Number(n)
  if (isNaN(num) || !isFinite(num)) return '0.00'
  return num.toFixed(2)
}
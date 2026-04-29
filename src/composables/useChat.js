import { ref } from 'vue'
import { getFinancialContext } from './useFinancialContext'

// Security: OpenAI calls now go through our Supabase Edge Function proxy
// The API key lives server-side only and is never exposed to the browser.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const PROXY_URL = `${SUPABASE_URL}/functions/v1/openai-proxy`

// Client-side rate limiting (supplements server-side limits)
const MIN_REQUEST_INTERVAL = 2000 // 2 seconds between requests
let lastRequestTime = 0

export function useChat() {
  const messages = ref([])
  const isTyping = ref(false)

  const suggestedPrompts = [
    'Can I afford a $200 purchase?',
    'How am I doing this month?',
    'What subscriptions do I have?',
    'Will I run out of money?',
    'How much should I save?',
    'When is my next payday?',
  ]

  function buildSystemPrompt() {
    const ctx = getFinancialContext()
    const today = new Date().toISOString().split('T')[0]

    return `You are Kudi AI, a friendly and intelligent personal finance assistant. You help users understand their finances quickly and take action.

TODAY'S DATE: ${today}

USER'S FINANCIAL SNAPSHOT:
- Current balance: $${safeNum(ctx.balance)}
- Total income (this period): $${safeNum(ctx.totalIncome)}
- Total expenses: $${safeNum(ctx.totalExpenses)}
- Total savings: $${safeNum(ctx.totalSavings)}
- Savings rate: ${safeNum(ctx.savingsRate)}%
- Average daily spend: $${safeNum(ctx.avgDailySpend)}
- Days until payday: ${ctx.daysUntilPayday}
- Lowest projected balance: $${safeNum(ctx.lowestBalance)}${ctx.lowestBalanceDate ? ' on ' + ctx.lowestBalanceDate : ''}
- Upcoming income this week: $${safeNum(ctx.upcomingIncomeThisWeek)}
- Upcoming expenses this week: $${safeNum(ctx.upcomingExpensesThisWeek)}
- Active subscriptions: ${ctx.activeSubscriptions || 'None tracked'}
- Active savings rules: ${ctx.activeSavings || 'None'}
- Total transactions: ${ctx.transactionCount}
- Shift count: ${ctx.shiftCount}
- Upcoming shifts: ${ctx.upcomingShifts}

YOUR PERSONALITY:
- Warm, concise, and actionable
- Use emojis sparingly for visual clarity
- Always give specific numbers, not vague advice
- If user asks about affordability, calculate impact and give a clear yes/no with reasoning
- Keep responses under 150 words unless user asks for detail
- Format with short paragraphs and bullet points for readability
- Never say "I'm not a financial advisor" — you ARE their finance assistant

RESPONSE FORMAT:
- Start with a direct answer
- Then provide supporting details
- End with a specific, actionable suggestion
- Use $ for dollar amounts`
  }

  async function send(text) {
    if (!text.trim()) return

    // Add user message
    messages.value.push({
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    })

    isTyping.value = true

    try {
      const response = await callOpenAI(text)
      messages.value.push({
        role: 'assistant',
        content: response,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('OpenAI API error, using fallback:', err.message)
      }
      const fallback = generateFallbackResponse(text)
      messages.value.push({
        role: 'assistant',
        content: fallback,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      })
    }

    isTyping.value = false
  }

  async function callOpenAI(userMessage) {
    if (!SUPABASE_URL) throw new Error('Supabase not configured')

    // Client-side rate limiting
    const now = Date.now()
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      throw new Error('Rate limited')
    }
    lastRequestTime = now

    // Build conversation history for context (last 10 messages)
    const conversationHistory = messages.value
      .slice(-10)
      .map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }))

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || `API returned ${response.status}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.'

    return { sections: [{ title: '', text }] }
  }

  function generateFallbackResponse(question) {
    const ctx = getFinancialContext()
    const t = question.toLowerCase()

    if (/\$?\d+/.test(t) && /afford|buy|purchase|spend|get|can i|should i/.test(t)) {
      const amount = extractAmount(question)
      if (amount > 0) {
        const balanceAfter = ctx.balance - amount
        const impact = Math.round((amount / Math.max(1, ctx.balance)) * 100)
        return {
          sections: [
            {
              title: balanceAfter >= 0 ? '✅ Yes, but be mindful' : '⚠️ Not recommended',
              text: `A $${amount} purchase would leave you with $${safeNum(balanceAfter)}. That's ${impact}% of your current balance. ${balanceAfter < ctx.lowestBalance ? 'This would be your new lowest point.' : ''}`,
            },
            {
              title: '💡 Suggestion',
              text: balanceAfter < 50
                ? `I'd hold off. You only have $${safeNum(ctx.balance)} and ${ctx.daysUntilPayday} days until payday.`
                : `This fits your budget. Just keep your daily average ($${safeNum(ctx.avgDailySpend)}/day) in mind.`,
            },
          ],
        }
      }
    }

    return {
      sections: [
        {
          title: '📊 Your snapshot',
          text: `Balance: $${safeNum(ctx.balance)} · Income: $${safeNum(ctx.totalIncome)} · Expenses: $${safeNum(ctx.totalExpenses)} · Daily avg: $${safeNum(ctx.avgDailySpend)}`,
        },
        {
          title: '💡 Tip',
          text: `Next payday in ${ctx.daysUntilPayday} days. ${ctx.lowestBalance < 100 ? '⚠️ You may run low before then.' : 'You should be good until then.'}`,
        },
      ],
    }
  }

  function clearChat() {
    messages.value = []
  }

  return {
    messages,
    isTyping,
    suggestedPrompts,
    send,
    clearChat,
  }
}

function safeNum(n) {
  const num = Number(n)
  if (isNaN(num) || !isFinite(num)) return '0.00'
  return num.toFixed(2)
}

function extractAmount(text) {
  const match = text.match(/\$?(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : 0
}
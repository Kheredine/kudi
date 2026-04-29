import { computed } from 'vue'
import { useFinance } from './useFinance'

export function getFinancialContext() {
  const {
    state,
    balance,
    currentBalance,
    pendingIncome,
    totalIncome,
    totalExpenses,
    totalSavings,
    forecast,
    lowestBalancePoint,
    daysUntilPayday,
    avgDailySpend,
    savingsRate,
    shiftIncomes,
    futureShiftIncome,
    generateRecurringInstances,
  } = useFinance()

  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const upcomingIncome = forecast.value
    .filter((f) => f.type === 'income')
    .reduce((sum, f) => sum + f.amount, 0)

  const upcomingExpenses = forecast.value
    .filter((f) => f.type === 'expense' || f.type === 'saving')
    .reduce((sum, f) => sum + Math.abs(f.amount), 0)

  const activeSubscriptions = state.recurring
    .filter((r) => r.active && r.type === 'expense')
    .map((r) => `${r.name} ($${r.amount})`)
    .join(', ')

  const activeSavings = state.recurring
    .filter((r) => r.active && r.type === 'saving')
    .map((r) => `${r.name} ($${r.amount}/${r.frequency})`)
    .join(', ')

  return {
    balance: currentBalance.value,
    pendingIncome: futureShiftIncome.value,
    totalIncome: totalIncome.value,
    totalExpenses: totalExpenses.value,
    totalSavings: totalSavings.value,
    savingsRate: savingsRate.value,
    avgDailySpend: avgDailySpend.value,
    daysUntilPayday: daysUntilPayday.value,
    lowestBalance: lowestBalancePoint.value?.balance || currentBalance.value,
    lowestBalanceDate: lowestBalancePoint.value?.date || null,
    upcomingIncomeThisWeek: upcomingIncome,
    upcomingExpensesThisWeek: upcomingExpenses,
    forecastDays: forecast.value.length,
    activeSubscriptions,
    activeSavings,
    shiftCount: state.shifts.length,
    upcomingShifts: state.shifts.filter((s) => s.date > now.toISOString().split('T')[0]).length,
    transactionCount: state.transactions.length,
  }
}

export function computeDecision(amount) {
  const { currentBalance, lowestBalancePoint, avgDailySpend, forecast } = useFinance()

  const impact = amount / Math.max(1, currentBalance.value)
  const balanceAfter = currentBalance.value - amount

  // Check if this would push any future balance negative
  const wouldCauseNegative = forecast.value.some(
    (f) => f.runningBalance - amount < 0
  )

  let riskLevel = 'low'
  let affordability = true

  if (balanceAfter < 0) {
    riskLevel = 'critical'
    affordability = false
  } else if (wouldCauseNegative || impact > 0.5) {
    riskLevel = 'high'
    affordability = false
  } else if (impact > 0.2 || balanceAfter < 200) {
    riskLevel = 'medium'
    affordability = true
  }

  let impactLevel = 'low'
  if (impact > 0.5) impactLevel = 'high'
  else if (impact > 0.15) impactLevel = 'medium'

  return {
    amount,
    affordability,
    riskLevel,
    impactLevel,
    balanceAfter: Math.round(balanceAfter * 100) / 100,
    impactPercent: Math.round(impact * 100),
  }
}
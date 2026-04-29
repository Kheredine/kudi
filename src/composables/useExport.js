import { jsPDF } from 'jspdf'
import { t } from './useI18n'
import { useFinance } from './useFinance'

// ============================================================
// DATE HELPERS
// ============================================================

function getDateRange(range) {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  switch (range) {
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return { start, end: today }
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      return { start, end }
    }
    case 'last3Months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0]
      return { start, end: today }
    }
    default:
      return { start: null, end: null }
  }
}

function filterByDate(items, range) {
  if (range === 'allTime') return items
  const { start, end } = getDateRange(range)
  return items.filter(item => {
    if (start && item.date < start) return false
    if (end && item.date > end) return false
    return true
  })
}

function formatDate(dateStr, lang) {
  const d = new Date(dateStr + 'T00:00:00')
  const locales = { en: 'en-US', fr: 'fr-FR', ru: 'ru-RU', es: 'es-ES' }
  return d.toLocaleDateString(locales[lang] || 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

// ============================================================
// PDF GENERATOR
// ============================================================

/**
 * Generate a PDF export of financial data
 * @param {Object} options
 * @param {string} options.dataSet - 'all' | 'income' | 'expense' | 'saving' | 'recurring' | 'forecast'
 * @param {string} options.dateRange - 'allTime' | 'thisMonth' | 'lastMonth' | 'last3Months'
 * @param {string} options.lang - 'en' | 'fr' | 'ru' | 'es'
 */
export function useExport() {
  const { state, getCurrencySymbol, fmtCurrency } = useFinance()

  function generatePDF({ dataSet, dateRange = 'allTime', lang = 'en' }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const sym = getCurrencySymbol(state.settings.baseCurrency)
    const pageW = doc.internal.pageSize.getWidth()
    const margin = 15
    const contentW = pageW - margin * 2
    let y = 0

    // ---- COLORS ----
    const green = [34, 197, 94]
    const dark = [15, 23, 42]
    const gray = [100, 116, 139]
    const lightGray = [241, 245, 249]
    const red = [239, 68, 68]
    const blue = [59, 130, 246]

    // ---- HEADER ----
    function drawHeader(title) {
      // Green accent bar
      doc.setFillColor(...green)
      doc.rect(0, 0, pageW, 3, 'F')

      y = 15
      doc.setFontSize(20)
      doc.setTextColor(...dark)
      doc.text(title, margin, y)

      y += 7
      doc.setFontSize(9)
      doc.setTextColor(...gray)
      doc.text(`${t(lang, 'pdfGenerated')} ${new Date().toLocaleString(lang === 'ru' ? 'ru-RU' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-US')}`, margin, y)

      if (state.settings.userName) {
        doc.text(`  •  ${state.settings.userName}`, margin + 55, y)
      }

      y += 3
      doc.setDrawColor(226, 232, 240)
      doc.line(margin, y, pageW - margin, y)
      y += 8
    }

    // ---- FOOTER ----
    function drawFooter(pageNum) {
      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(...gray)
      doc.text(`${t(lang, 'pdfPage')} ${pageNum}`, pageW / 2, pageH - 10, { align: 'center' })
      doc.text('Kudi — Smart Finance', pageW / 2, pageH - 6, { align: 'center' })
    }

    // ---- CHECK PAGE ----
    function checkPage(doc) {
      const pageH = doc.internal.pageSize.getHeight()
      if (y > pageH - 25) {
        drawFooter(doc.getNumberOfPages())
        doc.addPage()
        y = 20
        return true
      }
      return false
    }

    // ---- SUMMARY BOX ----
    function drawSummary(items) {
      const income = items.filter(i => i.type === 'income').reduce((s, i) => s + (i.amount || 0), 0)
      const expenses = items.filter(i => i.type === 'expense').reduce((s, i) => s + (i.amount || 0), 0)
      const savings = items.filter(i => i.type === 'saving').reduce((s, i) => s + (i.amount || 0), 0)
      const net = income - expenses - savings

      // Summary background
      doc.setFillColor(...lightGray)
      doc.roundedRect(margin, y, contentW, 30, 3, 3, 'F')

      const colW = contentW / 4
      const labels = [t(lang, 'totalIncome'), t(lang, 'totalExpenses'), t(lang, 'totalSavings'), t(lang, 'netBalance')]
      const values = [income, expenses, savings, net]
      const colors = [green, red, blue, net >= 0 ? green : red]

      labels.forEach((label, i) => {
        const x = margin + colW * i + colW / 2
        doc.setFontSize(8)
        doc.setTextColor(...gray)
        doc.text(label, x, y + 10, { align: 'center' })

        doc.setFontSize(12)
        doc.setTextColor(...colors[i])
        const prefix = i === 0 ? '+' : i === 3 ? (net >= 0 ? '+' : '-') : '-'
        const val = i === 3 ? Math.abs(net) : values[i]
        doc.text(`${prefix}${sym}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, x, y + 20, { align: 'center' })
      })

      y += 38
    }

    // ---- TABLE ----
    function drawTable(items, columns) {
      // Header
      doc.setFillColor(...dark)
      doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)

      let x = margin + 3
      columns.forEach(col => {
        doc.text(col.label, x, y + 5.5)
        x += col.width
      })
      y += 10

      // Rows
      items.forEach((item, idx) => {
        checkPage(doc)

        if (idx % 2 === 0) {
          doc.setFillColor(...lightGray)
          doc.rect(margin, y - 1, contentW, 7, 'F')
        }

        doc.setFontSize(8)
        doc.setTextColor(...dark)
        x = margin + 3

        columns.forEach(col => {
          const val = col.render(item)
          if (col.color) {
            const c = col.color(item)
            doc.setTextColor(...c)
          } else {
            doc.setTextColor(...dark)
          }
          doc.text(String(val).substring(0, 40), x, y + 4)
          x += col.width
        })
        y += 7
      })
    }

    // ============================================================
    // DATA SET PROCESSING
    // ============================================================

    let title = t(lang, 'pdfTitle')
    let items = []

    switch (dataSet) {
      case 'all':
        items = filterByDate(state.transactions, dateRange)
        title = `${t(lang, 'allTransactions')} — ${t(lang, 'pdfTitle')}`
        break
      case 'income':
        items = filterByDate(state.transactions.filter(t => t.type === 'income'), dateRange)
        title = `${t(lang, 'incomeOnly')} — ${t(lang, 'pdfTitle')}`
        break
      case 'expense':
        items = filterByDate(state.transactions.filter(t => t.type === 'expense'), dateRange)
        title = `${t(lang, 'expensesOnly')} — ${t(lang, 'pdfTitle')}`
        break
      case 'saving':
        items = filterByDate(state.transactions.filter(t => t.type === 'saving'), dateRange)
        title = `${t(lang, 'savingsOnly')} — ${t(lang, 'pdfTitle')}`
        break
      case 'recurring':
        items = state.recurring.map(r => ({
          ...r,
          date: r.frequency === 'monthly' ? `${t(lang, 'monthly')} ${r.day || ''}` : r.frequency === 'weekly' ? `${t(lang, 'weekly')} ${r.day_of_week || ''}` : t(lang, 'daily'),
          type: r.type,
          amount: r.amount,
          label: r.name,
          category: t(lang, 'recurring'),
        }))
        title = `${t(lang, 'recurringPayments')} — ${t(lang, 'pdfTitle')}`
        break
      case 'forecast': {
        const { forecast } = useFinance()
        items = forecast.value.map(f => ({
          ...f,
          label: f.label,
          amount: Math.abs(f.amount),
          type: f.type,
          date: f.date,
          category: f.isRecurring ? t(lang, 'recurring') : f.isShift ? 'Shift' : '',
        }))
        title = `${t(lang, 'forecastReport')} — ${t(lang, 'pdfTitle')}`
        break
      }
    }

    // ============================================================
    // BUILD PDF
    // ============================================================

    drawHeader(title)

    // Summary (only for transaction-based exports)
    if (['all', 'income', 'expense', 'saving'].includes(dataSet) && items.length > 0) {
      drawSummary(items)
    }

    // Section title
    doc.setFontSize(11)
    doc.setTextColor(...dark)
    doc.text(t(lang, 'details'), margin, y)
    y += 7

    if (items.length === 0) {
      doc.setFontSize(10)
      doc.setTextColor(...gray)
      doc.text(t(lang, 'noData'), margin, y)
    } else if (dataSet === 'recurring') {
      drawTable(items, [
        { label: t(lang, 'description'), width: 55, render: i => i.label },
        { label: t(lang, 'type'), width: 25, render: i => i.type === 'saving' ? t(lang, 'savings') : t(lang, 'expenses') },
        { label: t(lang, 'frequency'), width: 30, render: i => i.date },
        { label: t(lang, 'amount'), width: 35, render: i => `${sym}${i.amount.toFixed(2)}`, color: i => i.type === 'saving' ? blue : red },
        { label: t(lang, 'active'), width: 20, render: i => i.active ? '✓' : '✗' },
      ])
    } else if (dataSet === 'forecast') {
      drawTable(items, [
        { label: t(lang, 'date'), width: 28, render: i => formatDate(i.date, lang) },
        { label: t(lang, 'description'), width: 50, render: i => i.label },
        { label: t(lang, 'type'), width: 22, render: i => i.type === 'income' ? t(lang, 'income') : i.type === 'saving' ? t(lang, 'savings') : t(lang, 'expenses') },
        { label: t(lang, 'amount'), width: 30, render: i => `${sym}${i.amount.toFixed(2)}`, color: i => i.type === 'income' ? green : i.type === 'saving' ? blue : red },
        { label: t(lang, 'netBalance'), width: 35, render: i => `${sym}${(i.runningBalance || 0).toFixed(2)}`, color: i => (i.runningBalance || 0) >= 0 ? green : red },
      ])
    } else {
      drawTable(items, [
        { label: t(lang, 'date'), width: 28, render: i => formatDate(i.date, lang) },
        { label: t(lang, 'description'), width: 50, render: i => i.label },
        { label: t(lang, 'category'), width: 30, render: i => i.category },
        { label: t(lang, 'type'), width: 22, render: i => i.type === 'income' ? t(lang, 'income') : i.type === 'saving' ? t(lang, 'savings') : t(lang, 'expenses') },
        { label: t(lang, 'amount'), width: 35, render: i => `${sym}${i.amount.toFixed(2)}`, color: i => i.type === 'income' ? green : i.type === 'saving' ? blue : red },
      ])
    }

    drawFooter(1)

    // Save
    const fileName = `kudi-${dataSet}-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    return fileName
  }

  return { generatePDF }
}
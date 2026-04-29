<script setup>
import { ref } from 'vue'
import { useExport } from '../composables/useExport'
import { useFinance } from '../composables/useFinance'
import { t, LANGUAGES } from '../composables/useI18n'

const props = defineProps({
  initialDataSet: { type: String, default: 'all' }
})

const emit = defineEmits(['close'])

const { state } = useFinance()
const { generatePDF } = useExport()

const dataSet = ref(props.initialDataSet)
const dateRange = ref('allTime')
const exportLang = ref(state.settings.language || 'en')
const generating = ref(false)

const dataSets = [
  { value: 'all', icon: '📋' },
  { value: 'income', icon: '💰' },
  { value: 'expense', icon: '💸' },
  { value: 'saving', icon: '🏦' },
  { value: 'recurring', icon: '🔄' },
  { value: 'forecast', icon: '📊' },
]

const dateRanges = [
  { value: 'allTime' },
  { value: 'thisMonth' },
  { value: 'lastMonth' },
  { value: 'last3Months' },
]

function label(key) {
  return t(exportLang.value, key)
}

async function handleExport() {
  generating.value = true
  try {
    await new Promise(r => setTimeout(r, 100)) // let UI update
    generatePDF({
      dataSet: dataSet.value,
      dateRange: dateRange.value,
      lang: exportLang.value,
    })
    setTimeout(() => emit('close'), 500)
  } catch (e) {
    console.error('Export failed:', e)
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="export-modal">
        <!-- Header -->
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="modal-icon">📄</span>
            <h2>{{ label('exportData') }}</h2>
          </div>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <!-- Data Set Selection -->
        <div class="section">
          <label class="section-label">{{ label('selectDataSet') }}</label>
          <div class="data-set-grid">
            <button
              v-for="ds in dataSets"
              :key="ds.value"
              :class="['data-set-btn', { active: dataSet === ds.value }]"
              @click="dataSet = ds.value"
            >
              <span class="ds-icon">{{ ds.icon }}</span>
              <span class="ds-label">{{ label(ds.value === 'all' ? 'allTransactions' : ds.value === 'expense' ? 'expensesOnly' : ds.value === 'income' ? 'incomeOnly' : ds.value === 'saving' ? 'savingsOnly' : ds.value === 'recurring' ? 'recurringPayments' : 'forecastReport') }}</span>
            </button>
          </div>
        </div>

        <!-- Date Range -->
        <div class="section" v-if="!['recurring', 'forecast'].includes(dataSet)">
          <label class="section-label">{{ label('dateRange') }}</label>
          <div class="range-grid">
            <button
              v-for="dr in dateRanges"
              :key="dr.value"
              :class="['range-btn', { active: dateRange === dr.value }]"
              @click="dateRange = dr.value"
            >
              {{ label(dr.value === 'allTime' ? 'allTime' : dr.value === 'thisMonth' ? 'thisMonth' : dr.value === 'lastMonth' ? 'lastMonth' : 'last3Months') }}
            </button>
          </div>
        </div>

        <!-- Language -->
        <div class="section">
          <label class="section-label">{{ label('exportLanguage') }}</label>
          <div class="lang-grid">
            <button
              v-for="lang in LANGUAGES"
              :key="lang.code"
              :class="['lang-btn', { active: exportLang === lang.code }]"
              @click="exportLang = lang.code"
            >
              <span class="lang-flag">{{ lang.flag }}</span>
              <span class="lang-name">{{ lang.label }}</span>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <button class="btn-cancel" @click="emit('close')">
            {{ label('cancel') }}
          </button>
          <button class="btn-export" @click="handleExport" :disabled="generating">
            <span v-if="generating" class="spinner"></span>
            <span v-else>📄</span>
            {{ generating ? label('generating') : label('download') + ' PDF' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.export-modal {
  background: #0F172A;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-icon {
  font-size: 1.25rem;
}

.modal-title-row h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #F8FAFC;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #64748B;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.close-btn:hover { color: #F8FAFC; }

.section {
  margin-bottom: 1.25rem;
}

.section-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

/* Data Set Grid */
.data-set-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.data-set-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #94A3B8;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.data-set-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #CBD5E1;
}

.data-set-btn.active {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22C55E;
}

.ds-icon { font-size: 1rem; }
.ds-label { font-weight: 500; }

/* Date Range */
.range-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
}

.range-btn {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #94A3B8;
  font-size: 0.6875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.range-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.range-btn.active {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22C55E;
}

/* Language Grid */
.lang-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  color: #94A3B8;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s;
}

.lang-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.lang-btn.active {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #22C55E;
}

.lang-flag { font-size: 1.125rem; }
.lang-name { font-weight: 500; }

/* Actions */
.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-cancel {
  flex: 1;
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #94A3B8;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #CBD5E1;
}

.btn-export {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-export:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
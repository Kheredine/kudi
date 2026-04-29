import { ref, computed } from 'vue'

// ============================================================
// PRIVACY STATE (singleton)
// ============================================================

const isUnlocked = ref(false)

// Restore preference from localStorage
const savedBlur = localStorage.getItem('kudi-blur-unlocked')
if (savedBlur === 'true') {
  isUnlocked.value = true
}

// ============================================================
// PRIVACY TOGGLE
// ============================================================

function toggleBlur() {
  isUnlocked.value = !isUnlocked.value
  localStorage.setItem('kudi-blur-unlocked', String(isUnlocked.value))
}

function lock() {
  isUnlocked.value = false
  localStorage.setItem('kudi-blur-unlocked', 'false')
}

function unlock() {
  isUnlocked.value = true
  localStorage.setItem('kudi-blur-unlocked', 'true')
}

// ============================================================
// COMPOSABLE
// ============================================================

export function usePrivacy() {
  return {
    // State
    isUnlocked: computed(() => isUnlocked.value),

    // Actions
    toggleBlur,
    lock,
    unlock,
  }
}
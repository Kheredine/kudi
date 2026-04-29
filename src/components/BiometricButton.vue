<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps({
  mode: {
    type: String,
    default: 'login', // 'login', 'register', 'unlock'
    validator: (v) => ['login', 'register', 'unlock'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['success', 'error'])

const { isBiometricSupported, loginWithBiometric, registerBiometric } = useAuth()
const supported = ref(false)
const loading = ref(false)

onMounted(async () => {
  supported.value = await isBiometricSupported()
})

const labels = {
  login: 'Use Face ID / Fingerprint',
  register: 'Enable Face ID / Fingerprint',
  unlock: 'Unlock with Biometrics',
}

async function handleClick() {
  loading.value = true
  try {
    let result
    if (props.mode === 'register') {
      result = await registerBiometric()
    } else {
      result = await loginWithBiometric()
    }

    if (result.success) {
      emit('success')
    } else {
      emit('error', result.error)
    }
  } catch (e) {
    emit('error', 'Biometric authentication failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <button
    v-if="supported"
    class="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all duration-100"
    :class="{ 'opacity-50 pointer-events-none': disabled || loading }"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- Fingerprint icon -->
    <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.136 8.21M12 2.25c-2.265 0-4.3 1.014-5.66 2.613M12 2.25a7.5 7.5 0 017.5 7.5c0 1.884-.183 3.727-.536 5.513M12 2.25c-2.722 0-5.052 1.698-5.989 4.084M12 6.75a3.75 3.75 0 00-3.75 3.75c0 .862-.274 1.694-.792 2.392M12 6.75a3.75 3.75 0 013.75 3.75c0 .862.274 1.694.792 2.392M12 12.75a1.5 1.5 0 00-1.5 1.5c0 .735-.275 1.414-.736 1.936M12 12.75a1.5 1.5 0 011.5 1.5c0 .735.275 1.414.736 1.936" />
    </svg>

    <span class="text-sm font-medium text-text-primary">
      {{ loading ? 'Authenticating...' : labels[mode] }}
    </span>

    <!-- Loading spinner -->
    <svg v-if="loading" class="w-4 h-4 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  </button>
</template>
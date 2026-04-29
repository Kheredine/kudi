<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  length: {
    type: Number,
    default: 4
  },
  error: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  autoFocus: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    default: 'Enter your PIN'
  }
})

const emit = defineEmits(['update:modelValue', 'complete', 'error'])

const pin = ref(props.modelValue || '')
const shake = ref(false)
const inputRef = ref(null)

watch(() => props.modelValue, (val) => {
  pin.value = val || ''
})

watch(() => props.error, (val) => {
  if (val) {
    triggerShake()
  }
})

function triggerShake() {
  shake.value = true
  setTimeout(() => {
    shake.value = false
    pin.value = ''
    emit('update:modelValue', '')
  }, 400)
}

function handleInput(e) {
  const val = e.target.value.replace(/\D/g, '').slice(0, props.length)
  pin.value = val
  emit('update:modelValue', val)

  if (val.length === props.length) {
    emit('complete', val)
  }
}

function handleKeydown(e) {
  if (e.key === 'Backspace' && pin.value.length === 0) {
    return
  }
}

function focus() {
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

function clear() {
  pin.value = ''
  emit('update:modelValue', '')
}

defineExpose({ focus, clear })

// Auto-focus on mount
if (props.autoFocus) {
  nextTick(() => focus())
}
</script>

<template>
  <div class="flex flex-col items-center">
    <p v-if="title" class="text-sm text-text-secondary mb-6">{{ title }}</p>

    <!-- Hidden input for keyboard -->
    <input
      ref="inputRef"
      type="tel"
      inputmode="numeric"
      pattern="[0-9]*"
      :value="pin"
      :disabled="disabled"
      class="absolute opacity-0 w-0 h-0 pointer-events-none"
      autocomplete="off"
      @input="handleInput"
      @keydown="handleKeydown"
    />

    <!-- PIN Dots -->
    <div
      class="flex gap-4 mb-4"
      :class="{ 'animate-shake': shake }"
      @click="focus"
    >
      <div
        v-for="i in length"
        :key="i"
        class="w-4 h-4 rounded-full border-2 transition-all duration-200 cursor-pointer"
        :class="i <= pin.length
          ? 'bg-primary border-primary scale-110'
          : 'bg-transparent border-border hover:border-text-secondary'"
      />
    </div>

    <!-- Error message -->
    <transition name="fade">
      <p v-if="error" class="text-xs text-danger mt-2 text-center max-w-[200px]">{{ error }}</p>
    </transition>

    <!-- Number pad -->
    <div class="grid grid-cols-3 gap-3 mt-6 w-64">
      <button
        v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]"
        :key="n"
        class="w-18 h-14 rounded-2xl bg-surface border border-border text-lg font-semibold text-text-primary flex items-center justify-center active:scale-95 active:bg-primary/10 transition-all duration-100"
        :disabled="disabled"
        @click="handleInput({ target: { value: pin + n } })"
      >
        {{ n }}
      </button>
      <div class="w-18 h-14" />
      <button
        class="w-18 h-14 rounded-2xl bg-surface border border-border text-lg font-semibold text-text-primary flex items-center justify-center active:scale-95 active:bg-primary/10 transition-all duration-100"
        :disabled="disabled"
        @click="handleInput({ target: { value: pin + '0' } })"
      >
        0
      </button>
      <button
        class="w-18 h-14 rounded-2xl bg-surface border border-border text-lg font-semibold text-text-secondary flex items-center justify-center active:scale-95 active:bg-danger/10 transition-all duration-100"
        :disabled="disabled"
        @click="handleInput({ target: { value: pin.slice(0, -1) } })"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
        </svg>
      </button>
    </div>
  </div>
</template>
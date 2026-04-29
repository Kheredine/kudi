<script setup>
import { usePrivacy } from '../composables/usePrivacy'

const props = defineProps({
  blur: {
    type: Boolean,
    default: true
  }
})

const { isUnlocked, toggleBlur } = usePrivacy()
</script>

<template>
  <div class="relative">
    <!-- Content -->
    <div
      class="transition-all duration-300"
      :class="{ 'blur-lg select-none pointer-events-none': blur && !isUnlocked }"
    >
      <slot />
    </div>

    <!-- Overlay with eye icon -->
    <div
      v-if="blur && !isUnlocked"
      class="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
      @click="toggleBlur"
    >
      <div class="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
        <!-- Eye icon -->
        <svg class="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-xs font-medium text-text-secondary">Tap to reveal</span>
      </div>
    </div>
  </div>
</template>
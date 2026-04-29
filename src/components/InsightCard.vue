<script setup>
defineProps({
  type: { type: String, default: 'positive' },
  icon: { type: String, default: 'trend' },
  text: { type: String, required: true },
})
</script>

<template>
  <div
    class="rounded-2xl p-4 border transition-all duration-200"
    :class="type === 'warning'
      ? 'bg-danger/5 border-danger/20'
      : 'bg-primary/5 border-primary/20'"
  >
    <div class="flex items-start gap-3">
      <div
        class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        :class="type === 'warning' ? 'bg-danger/10' : 'bg-primary/10'"
      >
        <!-- Alert icon -->
        <svg v-if="icon === 'alert'" class="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <!-- Trend icon -->
        <svg v-else class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
      <p
        class="text-sm leading-relaxed"
        :class="type === 'warning' ? 'text-danger/90' : 'text-primary/90'"
      >
        {{ text }}
      </p>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { useFinance } from '../composables/useFinance'

const { spendingStreak, achievements, allPossibleAchievements } = useFinance()

const earnedIds = computed(() => new Set(achievements.value.map(a => a.id)))
const showAll = computed(() => achievements.value.length > 0 && allPossibleAchievements.length > 3)
</script>

<template>
  <div class="bg-card border border-border rounded-2xl p-4 animate-in">
    <!-- Streak -->
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-xl flex items-center justify-center"
           :class="spendingStreak.isHot ? 'bg-orange-500/15' : 'bg-surface'">
        <span class="text-xl">{{ spendingStreak.isHot ? '🔥' : '💪' }}</span>
      </div>
      <div>
        <p class="text-sm font-semibold text-text-primary">{{ spendingStreak.days }}-Day Streak</p>
        <p class="text-xs text-text-secondary">{{ spendingStreak.label }}</p>
      </div>
    </div>

    <!-- Streak bar -->
    <div class="mb-4">
      <div class="flex justify-between mb-1">
        <span class="text-[10px] text-text-secondary">Progress to 30 days</span>
        <span class="text-[10px] font-medium" :class="spendingStreak.days >= 30 ? 'text-green-400' : 'text-text-secondary'">{{ spendingStreak.days }}/30</span>
      </div>
      <div class="h-1.5 bg-surface rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500"
          :style="{ width: Math.min(100, (spendingStreak.days / 30) * 100) + '%' }"
          :class="spendingStreak.days >= 30 ? 'bg-green-400' : spendingStreak.days >= 7 ? 'bg-orange-400' : 'bg-primary'"
        />
      </div>
    </div>

    <!-- Achievements grid -->
    <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-2">Achievements ({{ achievements.length }}/{{ allPossibleAchievements.length }})</p>
    <div class="grid grid-cols-5 gap-2">
      <div
        v-for="ach in allPossibleAchievements"
        :key="ach.id"
        class="flex flex-col items-center gap-1"
      >
        <div
          class="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all"
          :class="earnedIds.has(ach.id)
            ? 'bg-primary/15 animate-confetti'
            : 'bg-surface opacity-30 grayscale'"
          :title="ach.title + ': ' + ach.desc"
        >
          {{ ach.icon }}
        </div>
      </div>
    </div>
    <p class="text-[9px] text-text-secondary/60 text-center mt-2">Keep using Kudi to unlock more!</p>
  </div>
</template>

<style scoped>
.grayscale {
  filter: grayscale(100%);
}
</style>
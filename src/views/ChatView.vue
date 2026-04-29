<script setup>
import { ref, nextTick, watch, computed } from 'vue'
import { useChat } from '../composables/useChat'
import { useFinance } from '../composables/useFinance'
import { getFinancialContext, computeDecision } from '../composables/useFinancialContext'

const { messages, isTyping, suggestedPrompts, send, clearChat } = useChat()
const { currentBalance, lowestBalancePoint, forecast } = useFinance()

const inputText = ref('')
const messagesContainer = ref(null)

// Context panel data (desktop)
const ctx = computed(() => getFinancialContext())
const riskLevel = computed(() => {
  if (currentBalance.value < 0) return { label: 'Critical', color: 'text-danger', bg: 'bg-danger/10' }
  if (lowestBalancePoint.value && lowestBalancePoint.value.balance < 100) return { label: 'High', color: 'text-amber-400', bg: 'bg-amber-400/10' }
  if (ctx.value.avgDailySpend > 80) return { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-400/10' }
  return { label: 'Low', color: 'text-primary', bg: 'bg-primary/10' }
})

async function handleSend() {
  if (!inputText.value.trim() || isTyping.value) return
  const text = inputText.value
  inputText.value = ''
  await send(text)
  scrollToBottom()
}

async function handlePrompt(prompt) {
  if (isTyping.value) return
  await send(prompt)
  scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

function fmt(n) {
  const num = Number(n)
  if (isNaN(num) || !isFinite(num)) return '$0.00'
  return '$' + num.toFixed(2)
}

watch(() => messages.value.length, () => scrollToBottom())
</script>

<template>
  <div class="flex h-[calc(100vh-2rem)] md:h-screen">
    <!-- Chat area -->
    <div class="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      <!-- Header -->
      <div class="px-5 pt-8 pb-4 shrink-0">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-text-primary flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              Kudi Chat
            </h1>
            <p class="text-sm text-text-secondary mt-1">Your personal financial mentor</p>
          </div>
          <button
            v-if="messages.length > 0"
            class="text-xs text-text-secondary hover:text-danger transition-colors px-3 py-1.5 rounded-lg hover:bg-danger/10"
            @click="clearChat"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        <!-- Welcome -->
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-4">
          <div class="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-text-primary mb-2">Ask me anything about your finances</h2>
          <p class="text-sm text-text-secondary mb-6 max-w-xs">I analyze your spending, forecast, and goals to give personalized advice.</p>
          <div class="w-full max-w-md space-y-2">
            <button
              v-for="prompt in suggestedPrompts"
              :key="prompt"
              class="w-full text-left px-4 py-3 rounded-xl bg-card border border-border text-sm text-text-secondary hover:text-text-primary hover:border-primary/30 transition-all duration-200"
              @click="handlePrompt(prompt)"
            >
              <span class="text-primary mr-2">→</span>{{ prompt }}
            </button>
          </div>
        </div>

        <!-- Messages -->
        <template v-for="(message, idx) in messages" :key="idx">
          <!-- User -->
          <div v-if="message.role === 'user'" class="flex justify-end">
            <div class="max-w-[80%] bg-primary/10 text-text-primary px-4 py-3 rounded-2xl rounded-br-md text-sm">
              {{ message.content }}
            </div>
          </div>

          <!-- AI -->
          <div v-else class="flex justify-start">
            <div class="max-w-[90%] lg:max-w-[85%] bg-card border border-border rounded-2xl rounded-bl-md overflow-hidden">
              <!-- Sections -->
              <div v-if="message.content?.sections" class="divide-y divide-border">
                <div v-for="(section, si) in message.content.sections" :key="si" class="px-4 py-3">
                  <p v-if="section.title" class="text-xs font-semibold text-text-primary mb-1.5">{{ section.title }}</p>
                  <p v-if="section.text" class="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{{ section.text }}</p>
                  <div v-if="section.items?.length" class="space-y-1 mt-1">
                    <div v-for="(item, ii) in section.items" :key="ii" class="flex items-start gap-2 text-xs text-text-secondary">
                      <span class="text-primary/50 mt-0.5">•</span>
                      <span>{{ item }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Fallback plain text -->
              <div v-else class="px-4 py-3">
                <p class="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{{ typeof message.content === 'string' ? message.content : JSON.stringify(message.content) }}</p>
              </div>
              <div class="px-4 pb-2 text-[10px] text-text-secondary/40">{{ message.time }}</div>
            </div>
          </div>
        </template>

        <!-- Typing -->
        <div v-if="isTyping" class="flex justify-start">
          <div class="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 bg-text-secondary/40 rounded-full animate-bounce" style="animation-delay: 0ms" />
              <div class="w-2 h-2 bg-text-secondary/40 rounded-full animate-bounce" style="animation-delay: 150ms" />
              <div class="w-2 h-2 bg-text-secondary/40 rounded-full animate-bounce" style="animation-delay: 300ms" />
            </div>
          </div>
        </div>
      </div>

      <!-- Quick prompts -->
      <div v-if="messages.length > 0 && !isTyping" class="px-5 pb-2 shrink-0">
        <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            v-for="prompt in suggestedPrompts.slice(0, 3)"
            :key="prompt"
            class="whitespace-nowrap text-xs px-3 py-1.5 rounded-lg bg-card border border-border text-text-secondary hover:text-text-primary hover:border-primary/30 transition-all shrink-0"
            @click="handlePrompt(prompt)"
          >
            {{ prompt }}
          </button>
        </div>
      </div>

      <!-- Input -->
      <div class="px-5 pb-6 pt-2 shrink-0">
        <form @submit.prevent="handleSend" class="flex items-center gap-3">
          <div class="flex-1 relative">
            <input
              v-model="inputText"
              type="text"
              placeholder="Ask about your finances..."
              :disabled="isTyping"
              class="w-full bg-card border border-border rounded-xl px-4 py-3.5 pr-12 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            :disabled="!inputText.trim() || isTyping"
            class="w-12 h-12 bg-primary hover:bg-primary-dim disabled:bg-surface disabled:text-text-secondary/30 text-white rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 shrink-0"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>

    <!-- Context Panel (desktop only) -->
    <div class="hidden lg:flex flex-col w-72 shrink-0 border-l border-border bg-card/50 h-full overflow-y-auto">
      <div class="p-5 space-y-5">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Context</h3>

        <!-- Current Balance -->
        <div class="bg-surface rounded-xl p-4">
          <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Balance</p>
          <p class="text-xl font-bold" :class="currentBalance >= 0 ? 'text-primary' : 'text-danger'">{{ fmt(currentBalance) }}</p>
        </div>

        <!-- Risk Level -->
        <div class="bg-surface rounded-xl p-4">
          <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-2">Risk Level</p>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 rounded-lg text-xs font-semibold" :class="riskLevel.bg + ' ' + riskLevel.color">{{ riskLevel.label }}</span>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="bg-surface rounded-xl p-4 space-y-2">
          <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-2">Quick Stats</p>
          <div class="flex justify-between text-xs">
            <span class="text-text-secondary">Avg daily spend</span>
            <span class="text-text-primary font-medium">{{ fmt(ctx.avgDailySpend) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-secondary">Days until payday</span>
            <span class="text-text-primary font-medium">{{ ctx.daysUntilPayday }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-secondary">Savings rate</span>
            <span class="text-text-primary font-medium">{{ ctx.savingsRate }}%</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-secondary">Upcoming income</span>
            <span class="text-primary font-medium">{{ fmt(ctx.upcomingIncomeThisWeek) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-text-secondary">Upcoming expenses</span>
            <span class="text-danger font-medium">{{ fmt(ctx.upcomingExpensesThisWeek) }}</span>
          </div>
        </div>

        <!-- Lowest Balance -->
        <div v-if="lowestBalancePoint" class="bg-surface rounded-xl p-4">
          <p class="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Lowest Projected</p>
          <p class="text-sm font-bold" :class="lowestBalancePoint.balance < 0 ? 'text-danger' : 'text-amber-400'">
            {{ fmt(lowestBalancePoint.balance) }}
          </p>
          <p class="text-[10px] text-text-secondary mt-0.5">{{ lowestBalancePoint.date }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
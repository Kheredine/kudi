<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useProfile, AVATARS, getAvatarMeta } from '../composables/useProfile'

const router = useRouter()
const { user, logout } = useAuth()
const { profile, updateProfile, deleteAccount } = useProfile()

const editUsername = ref(profile.value.username)
const saving = ref(false)
const saveMsg = ref('')
const deleting = ref(false)
const showDeleteConfirm = ref(false)

// Sync edit field when profile changes
const displayUsername = computed(() => profile.value.username)
const displayAvatar = computed(() => getAvatarMeta(profile.value.avatar))

async function saveUsername() {
  const name = editUsername.value.trim()
  if (!name || name.length < 2) {
    saveMsg.value = 'Username must be at least 2 characters'
    return
  }
  if (name === profile.value.username) return

  saving.value = true
  saveMsg.value = ''
  const result = await updateProfile({ username: name })
  saving.value = false

  if (result.success) {
    saveMsg.value = 'Saved ✓'
    setTimeout(() => { saveMsg.value = '' }, 2000)
  } else {
    saveMsg.value = result.error || 'Failed to save'
    editUsername.value = profile.value.username
  }
}

async function selectAvatar(avatarId) {
  if (avatarId === profile.value.avatar) return
  await updateProfile({ avatar: avatarId })
}

async function handleLogout() {
  await logout()
  router.replace('/auth')
}

async function handleDelete() {
  deleting.value = true
  await deleteAccount()
  deleting.value = false
  showDeleteConfirm.value = false
  router.replace('/auth')
}
</script>

<template>
  <div class="max-w-lg mx-auto pb-28">
    <!-- Header -->
    <div class="px-5 pt-8 pb-4">
      <h1 class="text-2xl font-bold text-text-primary">Profile</h1>
      <p class="text-sm text-text-secondary mt-1">Manage your identity</p>
    </div>

    <div class="px-5 space-y-4">
      <!-- Avatar Preview + Username -->
      <div class="bg-card border border-border rounded-2xl p-6">
        <div class="flex flex-col items-center">
          <!-- Large avatar preview -->
          <div
            class="w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-4xl shadow-lg mb-4"
            :class="displayAvatar.gradient"
          >
            {{ displayAvatar.emoji }}
          </div>
          <h2 class="text-lg font-bold text-text-primary">{{ displayUsername }}</h2>
          <p class="text-xs text-text-secondary mt-0.5">Member since {{ profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'now' }}</p>
        </div>
      </div>

      <!-- Username Edit -->
      <div class="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Username</h3>
        <div class="flex gap-2">
          <input
            v-model="editUsername"
            type="text"
            maxlength="24"
            class="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-colors"
            @keyup.enter="saveUsername"
          />
          <button
            class="px-5 bg-primary hover:bg-primary-dim text-white font-semibold rounded-xl text-sm transition-all active:scale-[0.97] flex items-center justify-center min-w-[72px]"
            :class="{ 'opacity-50 pointer-events-none': saving }"
            @click="saveUsername"
          >
            <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span v-else>Save</span>
          </button>
        </div>
        <transition name="fade">
          <p v-if="saveMsg" class="text-xs text-center" :class="saveMsg.includes('✓') ? 'text-green-400' : 'text-danger'">
            {{ saveMsg }}
          </p>
        </transition>
      </div>

      <!-- Avatar Selection -->
      <div class="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Avatar</h3>
        <div class="grid grid-cols-4 gap-2.5">
          <button
            v-for="avatar in AVATARS"
            :key="avatar.id"
            class="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 border-2"
            :class="profile.avatar === avatar.id
              ? 'border-primary bg-primary/10 scale-105'
              : 'border-transparent bg-surface hover:bg-surface/80 hover:scale-105'"
            @click="selectAvatar(avatar.id)"
          >
            <div
              class="w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl"
              :class="avatar.gradient"
            >
              {{ avatar.emoji }}
            </div>
            <span class="text-[10px] font-medium" :class="profile.avatar === avatar.id ? 'text-primary' : 'text-text-secondary'">
              {{ avatar.label }}
            </span>
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Account</h3>

        <!-- Logout -->
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-surface/80 transition-colors group"
          @click="handleLogout"
        >
          <div class="w-9 h-9 rounded-xl bg-text-secondary/10 flex items-center justify-center">
            <svg class="w-4.5 h-4.5 text-text-secondary group-hover:text-text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </div>
          <div class="flex-1 text-left">
            <p class="text-sm font-medium text-text-primary">Logout</p>
            <p class="text-xs text-text-secondary">Sign out of your account</p>
          </div>
          <svg class="w-4 h-4 text-text-secondary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <!-- Delete Account -->
        <button
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-danger/5 hover:bg-danger/10 transition-colors group"
          @click="showDeleteConfirm = true"
        >
          <div class="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center">
            <svg class="w-4.5 h-4.5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>
          <div class="flex-1 text-left">
            <p class="text-sm font-medium text-danger">Delete Account</p>
            <p class="text-xs text-text-secondary">Permanently remove all data</p>
          </div>
          <svg class="w-4 h-4 text-danger/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <transition name="fade">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm" @click.self="showDeleteConfirm = false">
        <div class="bg-card border border-border rounded-2xl p-6 w-full max-w-sm animate-in">
          <div class="flex flex-col items-center text-center">
            <div class="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
              <svg class="w-7 h-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-text-primary mb-1">Delete Account?</h3>
            <p class="text-sm text-text-secondary mb-6">This action is permanent. All your data — transactions, budgets, savings, and settings — will be permanently deleted.</p>
            <div class="flex gap-3 w-full">
              <button
                class="flex-1 py-3 rounded-xl bg-surface border border-border text-sm font-medium text-text-primary hover:bg-surface/80 transition-colors"
                @click="showDeleteConfirm = false"
              >
                Cancel
              </button>
              <button
                class="flex-1 py-3 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                :class="{ 'opacity-50 pointer-events-none': deleting }"
                @click="handleDelete"
              >
                <svg v-if="deleting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {{ deleting ? 'Deleting...' : 'Delete Forever' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
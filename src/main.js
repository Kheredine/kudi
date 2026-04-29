import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

createApp(App).use(router).mount('#app')

// Register service worker for PWA (installable + offline)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

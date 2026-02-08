import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'

// Import stores for initialization
import { useWorkspaceStore } from './stores/workspace'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

// Initialize workspace store (triggers migration if needed)
useWorkspaceStore(pinia)

app.mount('#app')

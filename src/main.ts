import AppIcon from '@/components/AppIcon.vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import App from './App.vue'
import './style.css'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// Create Vue application instance
const app = createApp(App)
// Create a Pinia store instance
const pinia = createPinia()

// Register global components
app.component('AppIcon', AppIcon)
app.component('RecycleScroller', RecycleScroller)

// Install plugins
app.use(pinia)

// Mount the application to the DOM
app.mount('#app')

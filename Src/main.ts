import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import '@fontsource-variable/roboto'
import '@fontsource-variable/roboto-mono'
import './style.css'
import './Design/material'

const app = createApp(App)

app.config.errorHandler = (error, _instance, info) => {
  console.error('[v2rayN Nova] Unhandled UI error', { info, error })
}

app.use(i18n)
app.mount('#app')

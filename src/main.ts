import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElAvatar,
  ElButton,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElInputNumber,
  ElProgress,
  ElRadioButton,
  ElRadioGroup,
  ElSlider,
} from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const elementComponents = [
  ElAvatar,
  ElButton,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElInputNumber,
  ElProgress,
  ElRadioButton,
  ElRadioGroup,
  ElSlider,
] as const

const app = createApp(App)

app.use(createPinia())
app.use(router)

for (const component of elementComponents) {
  app.component(component.name!, component)
}

app.mount('#app')

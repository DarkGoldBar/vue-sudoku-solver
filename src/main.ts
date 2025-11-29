import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import { createI18n } from "vue-i18n";
import ja from "./i18n/ja.json";
import en from "./i18n/en.json";
import zh from "./i18n/zh.json";

function detectLocale() {
  const langList = navigator.languages || [navigator.language];
  console.log(langList)
  for (const lang of langList) {
    const normalized = lang.toLowerCase();
    if (normalized.startsWith('zh')) return 'zh';
    if (normalized.startsWith('ja')) return 'ja';
    if (normalized.startsWith('en')) return 'en';
  }
  return 'en';
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  messages: {
    zh: zh,
    ja: ja,
    en: en,
  },
});

createApp(App).use(i18n).mount('#app')

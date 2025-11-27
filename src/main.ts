import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import { createI18n } from "vue-i18n";
import ja from "./i18n/ja.json";
import en from "./i18n/en.json";
import ch from "./i18n/ch.json";

const i18n = createI18n({
  legacy: false,
  locale: "ja",
  messages: {
    ja: ja,
    en: en,
    ch: ch,
  },
});

createApp(App).use(i18n).mount('#app')

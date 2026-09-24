<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

interface Props {
  githubUrl: string
}

defineProps<Props>()

const showSettingsMenu = ref(false)
const settings = ref<HTMLElement | null>(null)
const settingsButton = ref<HTMLButtonElement | null>(null)
const isDark = ref(document.documentElement.classList.contains('dark'))

const toggleDarkMode = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

const closeSettingsMenu = (restoreFocus = false) => {
  showSettingsMenu.value = false
  if (restoreFocus) settingsButton.value?.focus()
}

const handleClickOutside = (event: MouseEvent) => {
  if (settings.value && !settings.value.contains(event.target as Node)) {
    closeSettingsMenu()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showSettingsMenu.value) {
    closeSettingsMenu(true)
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header class="title-bar">
    <h1>{{ $t('title') }}</h1>

    <div ref="settings" class="settings">
      <button
        ref="settingsButton"
        type="button"
        class="btn-primary-outline settings-button"
        :aria-label="$t('settings.title')"
        :title="$t('settings.title')"
        aria-haspopup="menu"
        :aria-expanded="showSettingsMenu"
        @click="showSettingsMenu = !showSettingsMenu"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.17a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06L7.04 4.3l.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2h4v.49a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21v4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      <div v-if="showSettingsMenu" class="settings-menu" role="menu">
        <a
          :href="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="settings-link"
          role="menuitem"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" clip-rule="evenodd" />
          </svg>
          <span>{{ $t('settings.github') }}</span>
        </a>

        <label class="settings-row">
          <span>{{ $t('settings.language') }}</span>
          <select v-model="$i18n.locale">
            <option
              v-for="locale in $i18n.availableLocales"
              :key="`locale-${locale}`"
              :value="locale"
            >{{ $t('lang', 1, { locale }) }}</option>
          </select>
        </label>

        <button type="button" class="settings-row theme-toggle" role="menuitem" @click="toggleDarkMode">
          <span>{{ $t('settings.darkMode') }}</span>
          <span class="switch" :class="{ active: isDark }" aria-hidden="true"><i /></span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.title-bar {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  width: min(calc(var(--cell-size) * 9), calc(100% - 32px));
  margin: 0 auto;
}

.title-bar h1 {
  grid-column: 2;
  color: #0f172a;
  font-size: 30px;
  font-weight: 600;
  line-height: 44px;
  text-align: center;
}

.settings {
  position: relative;
  grid-column: 3;
}

.settings-button {
  display: grid;
  width: 44px;
  height: 44px;
  padding: 9px;
  cursor: pointer;
  place-items: center;
}

.settings-button svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.settings-menu {
  position: absolute;
  z-index: 50;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  box-shadow: 0 12px 30px rgb(15 23 42 / 0.18);
}

.settings-row,
.settings-link {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  color: inherit;
  font-weight: 500;
  text-decoration: none;
}

.settings-row + .settings-row,
.settings-link + .settings-row {
  border-top: 1px solid #e2e8f0;
}

.settings-link {
  justify-content: flex-start;
}

.settings-link svg {
  width: 22px;
  height: 22px;
  flex: none;
}

.settings-link:hover,
.theme-toggle:hover {
  background: #f8fafc;
}

.settings-row select {
  min-width: 104px;
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #334155;
}

.theme-toggle {
  border: 0;
  cursor: pointer;
  font-size: 16px;
}

.switch {
  position: relative;
  width: 38px;
  height: 22px;
  flex: none;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background-color 150ms ease;
}

.switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgb(15 23 42 / 0.25);
  transition: transform 150ms ease;
}

.switch.active { background: #3b82f6; }
.switch.active i { transform: translateX(16px); }

:global(.dark) .title-bar h1 { color: #f1f5f9; }
:global(.dark) .settings-menu { border-color: #475569; background: #1f2937; color: #e2e8f0; }
:global(.dark) .settings-row + .settings-row,
:global(.dark) .settings-link + .settings-row { border-color: #475569; }
:global(.dark) .settings-link:hover,
:global(.dark) .theme-toggle:hover { background: #374151; }
:global(.dark) .settings-row select { border-color: #64748b; background: #111827; color: #f1f5f9; }
</style>

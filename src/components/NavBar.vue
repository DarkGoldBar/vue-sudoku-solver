<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 定义props接口
interface Props {
  githubUrl: string
}

defineProps<Props>()

// 语言下拉菜单状态
const showLanguageMenu = ref(false)
const languageDropdown = ref<HTMLElement | null>(null)

// 暗色模式状态
const isDark = ref(document.documentElement.classList.contains('dark'))

// 切换暗色模式
const toggleDarkMode = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark')
}

// 处理点击外部关闭下拉菜单
const handleClickOutside = (event: MouseEvent) => {
  if (
    languageDropdown.value && 
    !languageDropdown.value.contains(event.target as Node)
  ) {
    showLanguageMenu.value = false
  }
}

// 添加和移除事件监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 shadow-md flex items-center px-4 z-50">
    <!-- 左侧插槽 -->
    <div class="flex-1">
      <slot></slot>
    </div>

    <!-- 右侧按钮组 -->
    <div class="flex items-center gap-4">
      <!-- GitHub -->
      <a :href="githubUrl" target="_blank" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
        </svg>
      </a>

      <!-- 语言选择 -->
      <div class="locale-changer">
        <select v-model="$i18n.locale">
          <option v-for="locale in $i18n.availableLocales" :key="`locale-${locale}`" :value="locale">{{ locale }}</option>
        </select>
      </div>

      <!-- 暗色模式切换 -->
      <button 
        @click="toggleDarkMode"
        class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        <svg v-if="!isDark" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </button>
    </div>
  </nav>
</template>

<template>
  <div class="card p-3 sm:p-6">
    <div class="mb-4 sm:mb-8">
      <h3
        class="mb-3 flex items-center text-xl font-bold text-gray-900 dark:text-gray-100 sm:mb-4 sm:text-2xl"
      >
        <i class="fas fa-graduation-cap mr-2 text-blue-600 sm:mr-3" />
        Codex 使用教程
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-400 sm:text-lg">
        跟着这个教程，你可以轻松在自己的电脑上安装并使用 Codex。
      </p>
    </div>

    <!-- 系统选择标签 -->
    <div class="mb-4 sm:mb-6">
      <div class="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 sm:gap-2 sm:p-2">
        <button
          v-for="system in tutorialSystems"
          :key="system.key"
          :class="[
            'flex flex-1 items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-300 sm:gap-2 sm:px-6 sm:py-3 sm:text-sm',
            activeTutorialSystem === system.key
              ? 'bg-white text-blue-600 shadow-sm dark:bg-blue-600 dark:text-white dark:shadow-blue-500/40'
              : 'text-gray-600 hover:bg-white/50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
          ]"
          @click="activeTutorialSystem = system.key"
        >
          <i :class="system.icon" />
          {{ system.name }}
        </button>
      </div>
    </div>

    <!-- 动态组件 -->
    <CodexTutorial :platform="activeTutorialSystem" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CodexTutorial from '@/components/tutorial/CodexTutorial.vue'

// 当前系统选择
const activeTutorialSystem = ref('windows')

// 系统列表
const tutorialSystems = [
  { key: 'windows', name: 'Windows', icon: 'fab fa-windows' },
  { key: 'macos', name: 'macOS', icon: 'fab fa-apple' },
  { key: 'linux', name: 'Linux / WSL2', icon: 'fab fa-linux' },
  { key: 'third-party', name: 'CherryStudio等第三方', icon: 'fas fa-plug' }
]
</script>

<style scoped>
.tutorial-container {
  min-height: calc(100vh - 300px);
}
</style>

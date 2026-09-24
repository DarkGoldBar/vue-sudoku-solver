<script setup lang="ts">
import NavBar from './components/NavBar.vue'
import SudokuTable from './components/SudokuTable.vue'
</script>

<template>
  <main class="page-layout">
    <NavBar github-url="https://github.com/DarkGoldBar/vue-sudoku-solver" />
    <SudokuTable />
  </main>
</template>

<style>
.page-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}
</style>

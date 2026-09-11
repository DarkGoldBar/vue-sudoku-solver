<script setup lang="ts">
import NavBar from './components/NavBar.vue'
import SudokuTable from './components/SudokuTable.vue'
</script>

<template>
  <NavBar
    github-url="https://github.com/DarkGoldBar/vue-sudoku-solver"
  />
  <div class="mt-16 mb-4 pt-2">
    <SudokuTable />
  </div>
</template>

<style>
</style>

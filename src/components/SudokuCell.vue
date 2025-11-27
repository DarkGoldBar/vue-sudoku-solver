<template>
  <div class="sudoku-cell">
    <div
      v-if="num"
      class="main-number"
      :class="{ error: mask & bitFor(num) }"
    >
      {{ num }}
    </div>
    <div v-else class="candidates-grid">
      <div
        v-for="n in 9"
        :key="n"
        class="candidate-number"
        :class="{ hidden: mask & bitFor(n) }"
      >
        {{ n }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { bitFor } from '../functions.js';

defineProps<{
  num: number;
  mask: number;
}>();
</script>

<style scoped>
.sudoku-cell {
  width: 60px;
  height: 60px;
  border: 1px solid #ccc;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.sudoku-cell:hover {
  background-color: #ddd;
}

.sudoku-cell.selected {
  background-color: #ef8;
}

.main-number {
  font-size: 24px;
  font-weight: bold;
}

.main-number.error {
  color: #ff4444;
  animation: shake 0.5s;
}

.candidates-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  width: 100%;
  height: 100%;
  padding: 2px;
}

.candidate-number {
  font-size: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.hideCandidate .candidate-number {
  visibility: hidden;
}

.hidden {
  visibility: hidden;
}
</style>

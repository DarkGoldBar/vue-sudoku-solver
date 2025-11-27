<template>
  <div class="sudoku-table">
    <div class="sudoku-grid" tabindex="0" @keydown="onKeyDown">
      <SudokuCell
        v-for="i in 81"
        :key="i - 1"
        :num="grid[i - 1] ?? 0"
        :mask="occupied[i - 1] ?? 0"
        :class="{ selected: i == (selectedCell ?? -1) + 1, hideCandidate: !showCandidate }"
        @click="handleCellClick(i - 1)"
      />
    </div>
    <div class="panel">
      <button 
        v-for="n in 9"
        class="btn"
        :key="n"
        @click="handleNumberSelect(n)"
      >
        {{ n }}
      </button>
      <button class="btn" @click="handleNumberSelect(0)">X</button>
    </div>
    <div class="panel">
      <button class="btn" @click="handleSolve()">{{ $t("btn.solve") }}</button>
      <button class="btn" @click="handleHint()">{{ $t("btn.hint") }}</button>
      <button class="btn" @click="handleExport()">{{ $t("btn.export") }}</button>
      <button class="btn" @click="handleImport()">{{ $t("btn.import") }}</button>
      <button class="btn" @click="handleNew()">{{ $t("btn.new") }}</button>
      <span class="btn">
        <input type="checkbox" id="btn-hideCan" v-model="showCandidate"></input>
        <label for="btn-hideCan">{{ $t("btn.showCandidate") }}</label>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SudokuCell from './SudokuCell.vue';
import { generateSudoku, generateQuest, getOccupied, solveNext } from '../functions.js';

const grid = ref<(number)[]>(Array(81).fill(0));
const occupied = ref<number[]>(Array(81).fill(0));
const selectedCell = ref<number | null>(null);
const showCandidate = ref<boolean>(false);

const reset = () => {
  grid.value.fill(0);
  occupied.value.fill(0);
}

// 处理键盘事件
const onKeyDown = (event: KeyboardEvent) => {
  if ((selectedCell.value === null) || (selectedCell.value < 0) || (selectedCell.value > 80)) return;
  const key = event.key
  if (/^[0-9]$/.test(key)) {
    const number = parseInt(key)
    handleNumberSelect(number)
    selectedCell.value = selectedCell.value + 1;
  }
}

// 处理格子点击
const handleCellClick = (pos: number) => {
  selectedCell.value = pos;
};

// 处理数字选择
const handleNumberSelect = (num: number) => {
  if ((selectedCell.value === null) || (selectedCell.value < 0) || (selectedCell.value > 80)) return;

  grid.value[selectedCell.value] = num;
  occupied.value = getOccupied(grid.value);
};

// 处理导出功能
const handleExport = () => {
  const exportString = grid.value.join('');
  window.prompt('Sudoku data (81 numbers):', exportString);
};

// 处理导入功能
const handleImport = (prefill?: string) => {
  const input = window.prompt('Please input 81 numbers (0 for empty):', prefill);

  if (!input) return; // 用户取消

  if (!/^\d{81}$/.test(input)) {
    alert('Invalid input! Please enter exactly 81 digits.');
    return;
  }

  if (!window.confirm('This will override current data. Continue?')) {
    return;
  }

  const newGrid = input.split('').map(Number);
  reset();
  grid.value = newGrid;
  occupied.value = getOccupied(newGrid);
};

const handleHint = () => {
  const {pos} = solveNext(grid.value, occupied.value)
  if (pos >= 0) {
    selectedCell.value = pos
  }
};

const handleSolve = () => {
  const {pos, num} = solveNext(grid.value, occupied.value)
  if (pos >= 0) {
    selectedCell.value = pos
    grid.value[selectedCell.value!] = num;
    occupied.value = getOccupied(grid.value);
  }
};

const handleNew = () => {
  const defaultSeed = Date.now();
  const defaultHoles = 50;

  let seed = defaultSeed;

  const holesInput = window.prompt(`holes (40-60)`, String(defaultHoles));
  const parsedH = parseInt(holesInput ?? '') 
  let holes = defaultHoles;
  if (!Number.isNaN(holesInput)) {
    holes = Math.min(60, Math.max(40, parsedH));
  }

  const fullGrid = generateSudoku(seed);
  const questGrid = generateQuest(seed, holes, fullGrid);
  reset();
  grid.value = questGrid;
  occupied.value = getOccupied(questGrid);
};
</script>

<style scoped>
.sudoku-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.sudoku-grid {
  display: grid;
  grid-template-columns: repeat(9, 60px);
  grid-template-rows: repeat(9, 60px);
  grid-gap: 1px;
  border: 2px solid #333;
}

.sudoku-grid > :nth-child(3n) {
  border-right: 2px solid #333;
}

.sudoku-grid > :nth-child(n + 19):nth-child(-n + 27),
.sudoku-grid > :nth-child(n + 46):nth-child(-n + 54) {
  border-bottom: 2px solid #333;
}

.panel {
  display: flex;
  gap: 10px;
}

.panel button {
  font-size: 18px;
  cursor: pointer;
}
</style>

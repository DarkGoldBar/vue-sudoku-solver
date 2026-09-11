<script setup lang="ts">
import { computed, ref } from 'vue';
import { bitFor } from '../functions.js';
import type { NumberKind } from '../numberKind';

const props = defineProps<{
  grid: number[];
  numberKinds: (NumberKind | null)[];
  occupied: number[];
  showCandidate: boolean;
  selectedCell: number | null;
}>();

const emit = defineEmits<{
  'update:selectedCell': [index: number | null];
  'input-number': [num: number];
}>();

const svg = ref<SVGSVGElement | null>(null);
const hoveredCell = ref<number | null>(null);
const relatedCells = computed(() => {
  const selected = props.selectedCell;
  const related = new Set<number>();
  if (selected === null || !Number.isInteger(selected) || selected < 0 || selected > 80) return related;
  const row = Math.floor(selected / 9);
  const col = selected % 9;
  for (let index = 0; index < 81; index++) {
    if (index === selected) continue;
    const cellRow = Math.floor(index / 9);
    const cellCol = index % 9;
    if (cellRow === row || cellCol === col || (
      Math.floor(cellRow / 3) === Math.floor(row / 3)
      && Math.floor(cellCol / 3) === Math.floor(col / 3)
    )) related.add(index);
  }
  return related;
});
const digits = Array.from({ length: 9 }, (_, index) => index + 1);
const cells = computed(() => Array.from({ length: 81 }, (_, index) => {
  const num = props.grid[index] ?? 0;
  const mask = props.occupied[index] ?? 0;
  const kind = props.numberKinds[index] ?? 'filled';
  return {
    index,
    x: (index % 9) * 100,
    y: Math.floor(index / 9) * 100,
    num,
    kind,
    error: kind === 'filled' && num !== 0 && (mask & bitFor(num)) !== 0,
    candidates: num === 0 ? digits.filter(digit => (mask & bitFor(digit)) === 0) : [],
  };
}));
const numbers = computed(() => cells.value.filter(cell => cell.num !== 0));
const emptyCells = computed(() => cells.value.filter(cell => cell.num === 0));

const lines = (positions: number[]) => positions.map(position =>
  `M ${position} 0 V 900 M 0 ${position} H 900`,
).join(' ');
const cellLines = lines([100, 200, 400, 500, 700, 800]);
const boxLines = lines([300, 600]);

function selectCell(index: number) {
  emit('update:selectedCell', index);
  svg.value?.focus({ preventScroll: true });
}

function onKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  const index = props.selectedCell;
  const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  if (index === null || !Number.isInteger(index) || index < 0 || index > 80) {
    if (arrows.includes(event.key)) {
      event.preventDefault();
      emit('update:selectedCell', 0);
    }
    return;
  }

  if (/^[0-9]$/.test(event.key)) {
    event.preventDefault();
    emit('input-number', Number(event.key));
    // Preserve sequential keyboard entry without moving beyond the board.
    emit('update:selectedCell', Math.min(index + 1, 80));
  } else if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    emit('input-number', 0);
  } else if (arrows.includes(event.key)) {
    event.preventDefault();
    const row = Math.floor(index / 9);
    const col = index % 9;
    const next = event.key === 'ArrowLeft' ? index - Number(col > 0)
      : event.key === 'ArrowRight' ? index + Number(col < 8)
      : event.key === 'ArrowUp' ? index - 9 * Number(row > 0)
      : index + 9 * Number(row < 8);
    emit('update:selectedCell', next);
  }
}
</script>

<template>
  <svg
    ref="svg"
    class="sudoku"
    viewBox="-2 -2 904 904"
    tabindex="0"
    aria-label="Sudoku"
    @keydown="onKeyDown"
    @pointerleave="hoveredCell = null"
    @pointercancel="hoveredCell = null"
  >
    <g class="cells">
      <rect
        v-for="cell in cells"
        :key="cell.index"
        class="cell"
        :class="{
          'is-related': relatedCells.has(cell.index),
          'is-hovered': hoveredCell === cell.index,
          'is-selected': selectedCell === cell.index,
        }"
        :x="cell.x"
        :y="cell.y"
        width="100"
        height="100"
        @pointerenter="hoveredCell = cell.index"
        @pointerdown="selectCell(cell.index)"
      />
    </g>
    <g class="candidates" pointer-events="none">
      <template v-if="showCandidate">
        <g v-for="cell in emptyCells" :key="cell.index" :transform="`translate(${cell.x} ${cell.y})`">
          <text
            v-for="digit in cell.candidates"
            :key="digit"
            class="candidate"
            :x="((digit - 1) % 3 + 0.5) * 100 / 3"
            :y="(Math.floor((digit - 1) / 3) + 0.5) * 100 / 3"
          >{{ digit }}</text>
        </g>
      </template>
    </g>
    <g class="numbers" pointer-events="none">
      <text
        v-for="cell in numbers"
        :key="cell.index"
        class="number"
        :class="[`is-${cell.kind}`, { 'is-error': cell.error }]"
        :x="cell.x + 50"
        :y="cell.y + 50"
      >{{ cell.num }}</text>
    </g>
    <g class="borders" pointer-events="none" fill="none">
      <path class="cell-lines" :d="cellLines" />
      <path class="box-lines" :d="boxLines" />
      <rect class="outer-border" x="0" y="0" width="900" height="900" />
    </g>
  </svg>
</template>

<style scoped>
.sudoku {
  display: block;
  width: calc(var(--cell-size, 60px) * 9);
  max-width: 100%;
  height: auto;
  aspect-ratio: 1;
  user-select: none;
  outline: none;
  background-color: var(--cell-bg, #fff);
}

.cell { fill: var(--cell-bg, #fff); cursor: pointer; }
.cell.is-related { fill: var(--cell-related-bg); }
.cell.is-hovered { fill: var(--cell-hover-bg); }
.cell.is-selected { fill: var(--cell-selected-bg); }

text {
  text-anchor: middle;
  dominant-baseline: central;
}

.number { font-size: 60px; font-weight: bold; }
.number.is-given { fill: var(--number-given-color); }
.number.is-filled { fill: var(--number-filled-color); }
.number.is-assumption { fill: var(--number-assumption-color); }
.number.is-error { fill: var(--error-color); }
.candidate { fill: var(--candidate-color, #555); font-size: 25px; }
.cell-lines { stroke: var(--cell-line-color, #ccc); stroke-width: 1; }
.box-lines, .outer-border { stroke: var(--border-color, #333); stroke-width: 4; }
</style>

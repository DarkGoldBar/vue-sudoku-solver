<template>
  <div class="sudoku-table">
    <div class="panel toolbar">
      <button class="btn" @click="openNewGame()">{{ $t("btn.new") }}</button>
      <button class="btn" @click="handleSolve()">{{ $t("btn.solve") }}</button>
      <button class="btn" @click="handleHint()">{{ $t("btn.hint") }}</button>
      <button
        class="btn-primary-outline"
        :aria-pressed="showCandidate"
        @click="showCandidate = !showCandidate"
      >{{ $t("btn.showCandidate") }}</button>
      <div class="input-modes" role="group" :aria-label="$t('mode.label')">
        <button
          v-for="mode in inputModes"
          :key="mode"
          class="btn-primary-outline"
          :aria-pressed="inputMode === mode"
          @click="inputMode = mode"
        >{{ $t(`mode.${mode}`) }}</button>
      </div>
    </div>
    <Sudoku
      :grid="grid"
      :number-kinds="numberKinds"
      :occupied="occupied"
      :show-candidate="showCandidate"
      v-model:selected-cell="selectedCell"
      @input-number="handleNumberSelect"
    />
    <div class="panel number-pad">
      <button
        v-for="n in 9"
        class="btn"
        :key="n"
        @click="handleNumberSelect(n)"
      >{{ n }}</button>
      <button class="btn" @click="handleNumberSelect(0)">X</button>
    </div>
  </div>
  <dialog ref="newGameDialog" class="new-game-dialog" aria-labelledby="new-game-title">
    <form @submit.prevent="handleNew">
      <h2 id="new-game-title">{{ $t('newGame.title') }}</h2>
      <p class="dialog-description">{{ $t('newGame.description') }}</p>
      <label for="new-game-holes">{{ $t('newGame.holes') }}</label>
      <div class="holes-control">
        <input
          id="new-game-holes"
          v-model.number="newGameHoles"
          type="number"
          min="30"
          max="60"
          step="1"
          required
          autofocus
          aria-describedby="new-game-holes-help"
        />
        <span id="new-game-holes-help">{{ $t('newGame.range') }}</span>
      </div>
      <p v-if="grid.some(num => num !== 0)" class="replace-notice">{{ $t('newGame.replace') }}</p>
      <div class="panel dialog-actions">
        <button type="button" class="btn-primary-outline" @click="newGameDialog?.close()">{{ $t('newGame.cancel') }}</button>
        <button type="submit" class="btn">{{ $t('newGame.start') }}</button>
      </div>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Sudoku from './Sudoku.vue';
import { canOverwrite, type NumberKind } from '../numberKind';
import { generateSudoku, generateQuest, getOccupied, solveNext } from '../functions.js';

const grid = ref<(number)[]>(Array(81).fill(0));
const numberKinds = ref<(NumberKind | null)[]>(Array(81).fill(null));
const inputModes: NumberKind[] = ['given', 'filled', 'assumption'];
const inputMode = ref<NumberKind>('filled');
const occupied = ref<number[]>(Array(81).fill(0));
const selectedCell = ref<number | null>(null);
const showCandidate = ref<boolean>(false);
const newGameDialog = ref<HTMLDialogElement | null>(null);
const newGameHoles = ref<number | string>(40);

const openNewGame = () => {
  newGameHoles.value = 40;
  newGameDialog.value?.showModal();
};

const reset = () => {
  grid.value.fill(0);
  numberKinds.value.fill(null);
  occupied.value.fill(0);
}

// 处理数字选择
const handleNumberSelect = (num: number, kind: NumberKind = inputMode.value) => {
  if ((selectedCell.value === null) || (selectedCell.value < 0) || (selectedCell.value > 80)) return;

  const index = selectedCell.value;
  if (!canOverwrite(numberKinds.value[index] ?? null, kind)) return;
  grid.value[index] = num;
  numberKinds.value[index] = num === 0 ? null : kind;
  occupied.value = getOccupied(grid.value);
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
    handleNumberSelect(num, 'filled');
  }
};

const handleNew = () => {
  const holes = Number(newGameHoles.value);
  if (!Number.isInteger(holes) || holes < 30 || holes > 60) return;
  const seed = Date.now();

  const fullGrid = generateSudoku(seed);
  const questGrid = generateQuest(seed, holes, fullGrid);
  reset();
  grid.value = questGrid;
  numberKinds.value = questGrid.map(num => num === 0 ? null : 'given');
  occupied.value = getOccupied(questGrid);
  selectedCell.value = null;
  inputMode.value = 'filled';
  newGameDialog.value?.close();
};
</script>

<style scoped>
.sudoku-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.panel {
  display: flex;
  gap: 10px;
}

.panel button {
  font-size: 22px;
  padding: 4px 10px;
  cursor: pointer;
}

.toolbar {
  flex-wrap: nowrap;
  justify-content: center;
  white-space: nowrap;
}

.toolbar > * {
  flex-shrink: 0;
}

.number-pad button {
  font-size: 28px;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  padding: 0;
  display: grid;
  place-items: center;
}

.input-modes {
  display: inline-flex;
}

.input-modes button {
  border-radius: 0;
}

.input-modes button + button {
  margin-left: -1px;
}

.input-modes button:first-child {
  border-radius: 0.25rem 0 0 0.25rem;
}

.input-modes button:last-child {
  border-radius: 0 0.25rem 0.25rem 0;
}

.input-modes button:focus-visible {
  position: relative;
  z-index: 1;
}

.new-game-dialog {
  margin: auto;
  width: min(440px, calc(100vw - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  color: #0f172a;
  box-shadow: 0 24px 64px #0f172a33;
}

.new-game-dialog::backdrop { background: #0f172a80; }
.new-game-dialog h2 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
.dialog-description { color: #64748b; margin-bottom: 24px; }
.new-game-dialog label { display: block; font-weight: 600; margin-bottom: 8px; }
.holes-control { display: flex; align-items: center; gap: 16px; }
.holes-control input {
  width: 112px;
  padding: 8px 12px;
  border: 1px solid #94a3b8;
  border-radius: 8px;
  font-size: 24px;
}
.holes-control input:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
.holes-control span { color: #64748b; }
.replace-notice { margin-top: 20px; color: #64748b; }
.dialog-actions { justify-content: flex-end; flex-wrap: wrap; margin-top: 28px; }

:global(.dark) .new-game-dialog { background: #1f2937; color: #f1f5f9; border-color: #475569; }
:global(.dark) .dialog-description,
:global(.dark) .replace-notice,
:global(.dark) .holes-control span { color: #cbd5e1; }
</style>

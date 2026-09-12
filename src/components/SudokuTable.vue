<template>
  <div class="sudoku-table">
    <div class="panel toolbar">
      <button class="btn" @click="openNewGame()">{{ $t("btn.new") }}</button>
      <button class="btn" @click="handlePhotoImport()">{{ $t("btn.photoImport") }}</button>
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
  <dialog
    ref="completionDialog"
    class="completion-dialog"
    aria-labelledby="completion-title"
    @cancel="closeCompletion"
  >
    <div class="confetti" aria-hidden="true">
      <i
        v-for="piece in confettiPieces"
        :key="piece.id"
        class="confetti-piece"
        :style="piece.style"
      />
    </div>
    <div class="completion-content">
      <span class="completion-icon" aria-hidden="true">✓</span>
      <h2 id="completion-title">{{ $t('completion.title') }}</h2>
      <p>{{ $t('completion.message') }}</p>
      <div class="panel dialog-actions">
        <button class="btn" autofocus @click="closeCompletion">{{ $t('completion.close') }}</button>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Sudoku from './Sudoku.vue';
import { canOverwrite, type NumberKind } from '../numberKind';
import { generateSudoku, generateQuest, getOccupied, solveNext } from '../functions.js';
import { openPhotoImport } from '../photoImport';

const { t } = useI18n();

const handlePhotoImport = async () => {
  const imported = await openPhotoImport(t, grid.value.some(Boolean));
  if (!imported) return;
  grid.value = imported;
  numberKinds.value = imported.map(num => num === 0 ? null : 'given');
  occupied.value = getOccupied(imported);
  solutionGrid.value = [];
  selectedCell.value = null;
  inputMode.value = 'given';
  closeCompletion();
};

const grid = ref<(number)[]>(Array(81).fill(0));
const numberKinds = ref<(NumberKind | null)[]>(Array(81).fill(null));
const inputModes: NumberKind[] = ['given', 'filled', 'assumption'];
const inputMode = ref<NumberKind>('filled');
const occupied = ref<number[]>(Array(81).fill(0));
const selectedCell = ref<number | null>(null);
const showCandidate = ref<boolean>(false);
const newGameDialog = ref<HTMLDialogElement | null>(null);
const completionDialog = ref<HTMLDialogElement | null>(null);
const newGameHoles = ref<number | string>(40);
const solutionGrid = ref<number[]>([]);
const confettiPieces = Array.from({ length: 52 }, (_, id) => ({
  id,
  style: {
    '--x': `${(id * 37) % 100}%`,
    '--delay': `${-((id * 71) % 1500)}ms`,
    '--duration': `${2200 + (id % 7) * 180}ms`,
    '--color': ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'][id % 5],
    '--rotation': `${(id * 53) % 360}deg`,
  },
}));

const openNewGame = () => {
  newGameHoles.value = 40;
  newGameDialog.value?.showModal();
};

const reset = () => {
  grid.value.fill(0);
  numberKinds.value.fill(null);
  occupied.value.fill(0);
}

const closeCompletion = () => completionDialog.value?.close();

const showCompletion = () => {
  if (!completionDialog.value?.open) completionDialog.value?.showModal();
};

// 处理数字选择
const handleNumberSelect = (
  num: number,
  kind: NumberKind = inputMode.value,
  checkCompletion = true,
) => {
  if ((selectedCell.value === null) || (selectedCell.value < 0) || (selectedCell.value > 80)) return;

  const index = selectedCell.value;
  if (!canOverwrite(numberKinds.value[index] ?? null, kind)) return;
  grid.value[index] = num;
  numberKinds.value[index] = num === 0 ? null : kind;
  occupied.value = getOccupied(grid.value);

  // A generated puzzle has a retained solution, so completion only occurs when
  // the final user-entered value matches that solution.
  if (checkCompletion && num !== 0 && solutionGrid.value[index] === num
    && grid.value.every((value, cellIndex) => value === solutionGrid.value[cellIndex])) {
    showCompletion();
  }
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
    handleNumberSelect(num, 'filled', false);
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
  solutionGrid.value = fullGrid;
  numberKinds.value = questGrid.map(num => num === 0 ? null : 'given');
  occupied.value = getOccupied(questGrid);
  selectedCell.value = null;
  inputMode.value = 'filled';
  newGameDialog.value?.close();
  closeCompletion();
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
  flex-wrap: wrap;
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

.completion-dialog {
  margin: auto;
  overflow: visible;
  padding: 0;
  border: 0;
  border-radius: 20px;
  background: transparent;
  color: #0f172a;
}

.completion-dialog::backdrop { background: rgb(15 23 42 / 0.62); }

.completion-content {
  position: relative;
  z-index: 1;
  width: min(360px, calc(100vw - 48px));
  padding: 32px;
  border-radius: 20px;
  background: #fff;
  text-align: center;
  box-shadow: 0 24px 64px #0f172a66;
}

.completion-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: #22c55e;
  color: #fff;
  font-size: 32px;
  font-weight: 700;
}

.completion-content h2 { margin-bottom: 8px; font-size: 28px; font-weight: 700; }
.completion-content p { color: #64748b; }
.completion-content .dialog-actions { justify-content: center; margin-top: 24px; }

.confetti { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.confetti-piece {
  position: absolute;
  top: -24px;
  left: var(--x);
  width: 10px;
  height: 18px;
  border-radius: 2px;
  background: var(--color);
  animation: confetti-fall var(--duration) var(--delay) linear infinite;
}

@keyframes confetti-fall {
  from { transform: translate3d(0, -30px, 0) rotate(var(--rotation)); }
  to { transform: translate3d(100px, 110vh, 0) rotate(calc(var(--rotation) + 720deg)); }
}

@media (prefers-reduced-motion: reduce) {
  .confetti-piece { animation: none; top: 12%; }
}

:global(.dark) .completion-content { background: #1f2937; color: #f8fafc; }
:global(.dark) .completion-content p { color: #cbd5e1; }
</style>

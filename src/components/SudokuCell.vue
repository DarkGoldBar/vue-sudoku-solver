<template>
  <div class="sudoku-cell" @click="handleClick">
    <!-- 当有确定数字时显示大数字 -->
    <div
      v-if="val"
      class="main-number"
      :class="{ error: (valCount[val - 1] ?? 0) > 0 }"
    >
      {{ val }}
    </div>
    <!-- 当没有确定数字时显示候选数字九宫格 -->
    <div v-else class="candidates-grid">
      <div
        v-for="n in 9"
        :key="n"
        class="candidate-number"
        :class="{ hidden: valCount[n - 1] ?? 0 > 0 }"
      >
        {{ n }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

const props = defineProps<{
  index: number;
  val: number | null;
  valCount: number[];
}>();

const emit = defineEmits<{
  (e: 'cellClick', index: number): void;
}>();

const handleClick = () => {
  emit('cellClick', props.index);
};
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

.hidden {
  visibility: hidden;
}
</style>

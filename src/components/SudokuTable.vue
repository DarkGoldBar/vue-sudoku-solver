<template>
  <div class="sudoku-table">
    <div class="sudoku-grid">
      <SudokuCell
        v-for="i in 81"
        :key="i - 1"
        :index="i - 1"
        :val="cells[i - 1]"
        :valCount="neighborCounts[i - 1]"
        @cellClick="handleCellClick"
        :class="{ selected: i == selectedCell + 1 }"
      />
    </div>
    <!-- 数字选择面板 -->
    <div class="panel">
      <button v-for="n in 9" :key="n" @click="handleNumberSelect(n)">
        {{ n }}
      </button>
      <button @click="handleNumberSelect(null)">X</button>
    </div>
    <!-- 控制按钮面板 -->
    <div class="panel">
      <button @click="handleSolve()">Solve</button>
      <button @click="handleHint()">Hint</button>
      <button @click="handleExport()">Export</button>
      <button @click="handleImport()">Import</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import SudokuCell from './SudokuCell.vue';

// 存储81个格子的值
const cells = ref<(number | null)[]>(Array(81).fill(null));

// 存储每个格子的邻居数字计数
// neighborCounts[i][n-1] 表示第i个格子的邻居中数字n的出现次数
const neighborCounts = ref<number[][]>(
  Array(81)
    .fill(null)
    .map(() => Array(9).fill(0))
);

// 当前选中的格子索引
const selectedCell = ref<number | null>(null);

// 计算邻接表
const buildNeighborMap = () => {
  const map: number[][] = Array(81)
    .fill(null)
    .map(() => []);

  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);

    // 添加同行邻居
    for (let c = 0; c < 9; c++) {
      if (c !== col) {
        map[i].push(row * 9 + c);
      }
    }

    // 添加同列邻居
    for (let r = 0; r < 9; r++) {
      if (r !== row) {
        map[i].push(r * 9 + col);
      }
    }

    // 添加同宫邻居
    const blockRowStart = Math.floor(block / 3) * 3;
    const blockColStart = (block % 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const index = (blockRowStart + r) * 9 + (blockColStart + c);
        if (index !== i && !map[i].includes(index)) {
          map[i].push(index);
        }
      }
    }
  }

  return map;
};

// 邻接表
const neighborMap = buildNeighborMap();

// 更新邻居计数
const updateNeighborCounts = (
  index: number,
  oldVal: number | null,
  newVal: number | null
) => {
  // 移除旧值的计数
  if (oldVal !== null) {
    neighborMap[index].forEach((neighbor) => {
      neighborCounts.value[neighbor][oldVal - 1]--;
    });
  }

  // 添加新值的计数
  if (newVal !== null) {
    neighborMap[index].forEach((neighbor) => {
      neighborCounts.value[neighbor][newVal - 1]++;
    });
  }
};

// 处理格子点击
const handleCellClick = (index: number) => {
  selectedCell.value = index;
};

// 处理数字选择
const handleNumberSelect = (num: number | null) => {
  if (selectedCell.value === null) return;

  const oldVal = cells.value[selectedCell.value];
  cells.value[selectedCell.value] = num;
  updateNeighborCounts(selectedCell.value, oldVal, num);
};

// 处理导出功能
const handleExport = () => {
  const exportString = cells.value
    .map((val) => (val === null ? '0' : val))
    .join('');
  const result = window.prompt('Sudoku data (81 numbers):', exportString);
};

// 处理导入功能
const handleImport = () => {
  const input = window.prompt('Please input 81 numbers (0 for empty):');

  if (!input) return; // 用户取消

  // 验证输入
  if (!/^\d{81}$/.test(input)) {
    alert('Invalid input! Please enter exactly 81 digits.');
    return;
  }

  // 确认是否要覆盖当前数据
  if (!window.confirm('This will override current data. Continue?')) {
    return;
  }

  // 清除所有现有数据的邻居计数
  cells.value.forEach((val, index) => {
    if (val !== null) {
      updateNeighborCounts(index, val, null);
    }
  });

  // 更新数据
  const newValues = input.split('').map((char) => {
    const num = parseInt(char);
    return num === 0 ? null : num;
  });

  cells.value = newValues;

  // 更新新数据的邻居计数
  newValues.forEach((val, index) => {
    if (val !== null) {
      updateNeighborCounts(index, null, val);
    }
  });
};

const handleHint = () => {
  // 策略1：找到候选数字只有1个的空格子
  for (let i = 0; i < 81; i++) {
    if (cells.value[i] !== null) continue;

    // 计算这个格子的候选数字
    if (neighborCounts.value[i].filter((x) => x == 0).length == 1) {
      selectedCell.value = i;
      return neighborCounts.value[i].indexOf(0) + 1;
    }
  }

  // 策略2：检查每一行
  for (let row = 0; row < 9; row++) {
    const emptyIndices = [];
    for (let col = 0; col < 9; col++) {
      const index = row * 9 + col;
      if (cells.value[index] === null) {
        emptyIndices.push(index);
      }
    }

    for (let n = 1; n <= 9; n++) {
      let possiblePositions = [];
      for (const index of emptyIndices) {
        if (neighborCounts.value[index][n - 1] === 0) {
          possiblePositions.push(index);
        }
      }
      if (possiblePositions.length === 1) {
        selectedCell.value = possiblePositions[0];
        return n;
      }
    }
  }

  // 策略3：检查每一列
  for (let col = 0; col < 9; col++) {
    const emptyIndices = [];
    for (let row = 0; row < 9; row++) {
      const index = row * 9 + col;
      if (cells.value[index] === null) {
        emptyIndices.push(index);
      }
    }

    for (let n = 1; n <= 9; n++) {
      let possiblePositions = [];
      for (const index of emptyIndices) {
        if (neighborCounts.value[index][n - 1] === 0) {
          possiblePositions.push(index);
        }
      }
      if (possiblePositions.length === 1) {
        selectedCell.value = possiblePositions[0];
        return n;
      }
    }
  }

  // 策略4：检查每一宫
  for (let block = 0; block < 9; block++) {
    const blockRow = Math.floor(block / 3) * 3;
    const blockCol = (block % 3) * 3;
    const emptyIndices = [];

    // 收集这一宫中的空格子
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const index = (blockRow + i) * 9 + (blockCol + j);
        if (cells.value[index] === null) {
          emptyIndices.push(index);
        }
      }
    }

    for (let n = 1; n <= 9; n++) {
      let possiblePositions = [];
      for (const index of emptyIndices) {
        if (neighborCounts.value[index][n - 1] === 0) {
          possiblePositions.push(index);
        }
      }
      if (possiblePositions.length === 1) {
        selectedCell.value = possiblePositions[0];
        return n;
      }
    }
  }
};

const handleSolve = () => {
  const res = handleHint();
  if (res) {
    handleNumberSelect(res);
  }
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

/* 加粗3x3宫的边框 */
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
  height: 40px;
  font-size: 18px;
  cursor: pointer;
}
</style>

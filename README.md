# 轮椅数独

解数独辅助工具

https://darkgoldbar.github.io/vue-sudoku-solver

## 项目设计

- Vue3<script setup lang="ts">
- App.vue -> sudokuTable.vue -> sudokuCell.vue

## 模块设计

### App.vue

- 标题 Sudoku Solver
- sudokuTable
- 数字输入按钮
- 控制按钮：
  - 提示并解一个格子
  - 提示一个格子
  - 导出当前盘面为 81 个数字，0 表示空位
  - 从 81 个数字导入盘面，0 表示空位

### sudokuTable.vue

- 一次性计算一个邻接映射表，保存每个格子的邻接格子。每个格子对应：同列，同行，同宫，每种 8 个，共计 24 个邻居格子。
- 包含 81 个 sudokuCell，使用一维数组保存，方便遍历。
- 一个 cell 中填写数字时，使它的邻居的对应数字的计数器加一
- 一个 cell 中取消填写数字时，使它的邻居的对应数字的计数器减一

### sudokuCell.vue

- val 储存当前填写的数字 1-9
- valCount 储存 9 个数字的邻居计数
- 当 val 存在时，显示大字的 val。如果当前 val 的对应的邻居计数为 0，正常显示。如果大于 0，则为填写错误，标红警告
- 当 val 不存在时，以迷你九宫格显示 9 个候选数字。只有邻居计数为 0 的数字显示，大于 0 的不显示。

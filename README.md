# 轮椅数独

一个纯前端的数独辅助与练习工具：输入盘面后即时显示候选数、标记冲突，并可按基础逻辑逐步给出提示或填入答案。

在线使用：https://darkgoldbar.github.io/vue-sudoku-solver

## 特性

- 自动显示每个空格的合法候选数，已填冲突数字以红色提示
- 支持鼠标与键盘输入、选中格高亮及候选数显隐
- 提示或填入下一步：识别 Naked Single 和 Hidden Single
- 按指定挖空数生成保证唯一解的新题
- 以 81 位数字字符串导入、导出盘面（`0` 表示空格）
- 中、英、日三语界面与深色模式

## 架构

```
App
├── NavBar         # 语言、深色模式、GitHub 链接
└── SudokuTable    # 81 格盘面状态、输入/导入导出、提示与生成
    └── SudokuCell # 数字、候选数与冲突渲染

functions.js       # 邻接表、候选掩码、求解与唯一解题目生成
```

盘面以长度为 81 的一维数组保存。初始化时建立每格的 24 个邻居（同行、同列、同宫），并以 9 位位掩码计算已占用数字；界面渲染、冲突判断和单步求解均复用这份状态。

## 技术栈

Vue 3、TypeScript、Vite、Vue I18n、Tailwind CSS。

## 本地运行

```bash
npm install
npm run dev
```

```bash
npm run build
```

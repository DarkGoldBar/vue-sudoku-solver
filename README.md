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
- 拍照或选择图片导入印刷体数独：定位棋盘、透视矫正、逐格识别

## 拍照导入

点击工具栏的「拍照导入」后，弹窗先显示，再异步加载 OpenCV.js、Tesseract.js 的浏览器 LSTM 识别引擎和英文模型。加载期间即可拍照或选择图片；组件就绪后才能「识别并导入」。首次使用需要联网下载，图片仅在浏览器内处理，不上传服务器。

支持纸质印刷数独和截图。尽量拍清楚并保持数字正向；预览提供 90° 旋转、自动棋盘定位和四角拖动（也支持方向键）。整页含多道题时，拖动四角选择需要的题目。完成识别后直接替换当前棋盘，数字作为「题面」导入，不额外展示数字校对界面；误识别可在主棋盘的「题面」模式修改。不针对手写数字、候选数或弯曲书页进行识别优化。

功能集中在 `src/photoImport.ts`，主界面只调用 `await openPhotoImport(t, hasBoard)`：成功返回按行排列的 81 个数字（空格为 `0`），取消返回 `null`。关闭弹窗会取消当前任务并释放识别 worker；已加载的脚本可复用。外部依赖采用固定版本：OpenCV.js 4.10.0、Tesseract.js 6.0.1、Tesseract.js-core 6.0.0，脚本来自 jsDelivr，模型来自 projectnaptha.com。模型与参数接口见 [Tesseract.js 文档](https://github.com/naptha/tesseract.js/blob/v6.0.1/docs/api.md)。

## 架构

```
App
├── NavBar         # 语言、深色模式、GitHub 链接
└── SudokuTable    # 81 格盘面状态、输入/导入导出、提示与生成
    └── Sudoku     # SVG 数字、候选数与冲突渲染

functions.js       # 邻接表、候选掩码、求解与唯一解题目生成
photoImport.ts     # 独立图片导入弹窗、按需依赖加载、棋盘矫正与 OCR
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

export function generateSudokuSolution(seed: number): number[] {
    // 定数（9ビット：数字1～9の使用状態）
    const ALL = 0x1FF;


    // 擬似乱数（Mulberry32）：高速・決定論的
    // 参考：Mulberry32 は広く使われる軽量PRNGの一種
    function mulberry32(a: number) {
        let t = (a | 0) >>> 0;
        return function (): number {
            t += 0x6D2B79F5;
            let r = Math.imul(t ^ (t >>> 15), 1 | t);
            r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
            return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
        };
    }
    const rand = mulberry32(seed);
    function randInt(n: number): number {
        return Math.floor(rand() * n);
    }
    function shuffle(arr: number[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = randInt(i + 1);
            const tmp = arr[i];
            arr[i] = arr[j]!;
            arr[j] = tmp!;
        }
    }


    // ビットカウント（候補数の計算用）
    function bitCount(x: number): number {
        let c = 0;
        while (x) {
            x &= x - 1;
            c++;
        }
        return c;
    }


    // 盤面インデックス→行・列・宮
    function rowOf(idx: number): number {
        return (idx / 9) | 0;
    }
    function colOf(idx: number): number {
        return idx % 9;
    }
    function boxIndex(r: number, c: number): number {
        return ((r / 3) | 0) * 3 + ((c / 3) | 0);
    }


    // 盤面・制約マスクの初期化
    const grid: number[] = new Array(81).fill(0); // 0は空
    const rowMask: number[] = new Array(9).fill(0); // 各行の使用数字ビット
    const colMask: number[] = new Array(9).fill(0); // 各列の使用数字ビット
    const boxMask: number[] = new Array(9).fill(0); // 各宮（3×3）の使用数字ビット


    // 再帰的バックトラック（MRV＋候補シャッフル）
    function solve(filled: number): boolean {
        // 全81マスが埋まったら成功
        if (filled === 81) return true;


        // 次に埋めるマスを選ぶ（MRV：候補が最少の空マス）
        let minCount = 10;
        const bestCells: number[] = [];

        for (let idx = 0; idx < 81; idx++) {
            if (grid[idx] !== 0) continue;
            const r = rowOf(idx);
            const c = colOf(idx);
            const b = boxIndex(r, c);
            const allowedMask = ~(rowMask[r]! | colMask[c]! | boxMask[b]!) & ALL;
            const cnt = bitCount(allowedMask);

            // 候補0は即座に矛盾→この枝は失敗
            if (cnt === 0) return false;

            if (cnt < minCount) {
                minCount = cnt;
                bestCells.length = 0;
                bestCells.push(idx);
                // 候補1なら十分良いので探索を絞る
                if (cnt === 1) break;
            } else if (cnt === minCount) {
                bestCells.push(idx);
            }
        }

        // 同率最少の候補からランダムに1つ選ぶ（多様性のため）
        const bestIdx = bestCells[randInt(bestCells.length)];
        const r = rowOf(bestIdx!);
        const c = colOf(bestIdx!);
        const b = boxIndex(r, c);
        const allowedMask = ~(rowMask[r]! | colMask[c]! | boxMask[b]!) & ALL;

        // 候補数字を列挙してランダム順に試す
        const candidates: number[] = [];
        for (let d = 1; d <= 9; d++) {
            const bit = 1 << (d - 1);
            if (allowedMask & bit) candidates.push(d);
        }
        shuffle(candidates);

        for (const d of candidates) {
            const bit = 1 << (d - 1);

            // 配置
            grid[bestIdx!] = d;
            rowMask[r]! |= bit;
            colMask[c]! |= bit;
            boxMask[b]! |= bit;

            // 次へ
            if (solve(filled + 1)) return true;

            // 取り消し（バックトラック）
            grid[bestIdx!] = 0;
            rowMask[r]! &= ~bit;
            colMask[c]! &= ~bit;
            boxMask[b]! &= ~bit;
        }

        // すべての候補が失敗
        return false;

    }


    // 実行
    if (!solve(0)) {
        throw new Error("生成失敗：唯一解の完全盤面を構成できませんでした");
    }
    return grid;
}


export function generateSudokuQuestion(grid: number[], holes: number = 40): number[] {
    if (grid.length !== 81) {
      throw new Error("Grid must have length 81.");
    }
  
    const puzzle = [...grid];
    const positions = Array.from({ length: 81 }, (_, i) => i);
  
    // 打乱位置
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = positions[i]!
      positions[i] = positions[j]!
      positions[j] = tmp
    }
  
    let removed = 0;
    for (const pos of positions) {
      if (removed >= holes) break;
      const backup = puzzle[pos]!;
      puzzle[pos] = 0;
  
      if (!hasUniqueSolution(puzzle)) {
        puzzle[pos] = backup; // 恢复
      } else {
        removed++;
      }
    }
  
    return puzzle;
  }
  
  // 判断棋盘是否有唯一解
  function hasUniqueSolution(grid: number[]): boolean {
    let solutionCount = 0;
  
    function solve(board: number[]): boolean {
      const idx = board.indexOf(0);
      if (idx === -1) {
        solutionCount++;
        return solutionCount > 1; // 超过一个解就提前终止
      }
  
      const row = Math.floor(idx / 9);
      const col = idx % 9;
  
      for (let num = 1; num <= 9; num++) {
        if (isValid(board, row, col, num)) {
          board[idx] = num;
          if (solve(board)) return true; // 超过一个解，直接返回
          board[idx] = 0;
        }
      }
      return false;
    }
  
    solve([...grid]); // 使用拷贝，避免修改原数组
    return solutionCount === 1;
  }
  
  // 检查是否能放置数字
  function isValid(board: number[], row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[row * 9 + i] === num) return false; // 行
      if (board[i * 9 + col] === num) return false; // 列
      const r = Math.floor(row / 3) * 3 + Math.floor(i / 3);
      const c = Math.floor(col / 3) * 3 + (i % 3);
      if (board[r * 9 + c] === num) return false; // 宫
    }
    return true;
  }
  
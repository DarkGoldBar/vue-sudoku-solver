/**
 * Mulberry32 随机数生成器
 * @param {number[]} seed 
 * @returns 
 */
export function mulberry(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function buildNeighborMap() {
  /** @type {number[][]} */
  const map = Array.from({ length: 81 }, () => []);

  for (let pos = 0; pos < 81; pos++) {
    const row = Math.floor(pos / 9);
    const col = pos % 9;
    const block = Math.floor(row / 3) * 3 + Math.floor(col / 3);

    for (let c = 0; c < 9; c++) {
      if (c !== col) {
        map[pos].push(row * 9 + c);
      }
    }

    for (let r = 0; r < 9; r++) {
      if (r !== row) {
        map[pos].push(r * 9 + col);
      }
    }

    const blockRowStart = Math.floor(block / 3) * 3;
    const blockColStart = (block % 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const index = (blockRowStart + r) * 9 + (blockColStart + c);
        if (index !== pos) {
          map[pos].push(index);
        }
      }
    }
  }

  return map;
}

export const neighborMap = buildNeighborMap();
/** @type {(n: number) => number} */
export const bitFor = (n) => n ? 1 << (n-1) : 0

/**
 * 
 * @param {number[]} grid 
 * @returns 
 */
export function getOccupied(grid){
  const occupied = Array.from({length: 81}, () => 0);
  for (let i = 0; i < 81; i++) {
    for (const pos of neighborMap[i]) {
      occupied[pos] = occupied[pos] | (bitFor(grid[i]))
    }
  }
  return occupied;
}

/**
 * 
 * @param {number[]} grid 
 * @param {number} pos 
 * @param {number} num 
 * @returns {boolean}
 */
export function isValid(grid, pos, num) {
  if (grid.length !== 81) return false;
  if ((pos < 0) || (pos > 80)) return false;
  return neighborMap[pos].every(p => grid[p] !== num);
}

/**
 * 生成完整的数独谜底
 * @param {number} seed 
 * @returns {number[]}
 */
export function generateSudoku(seed) {
  const random = mulberry(seed);
  const grid = new Array(81).fill(0);
  
  function fillGrid(pos) {
    if (pos === 81) return true;

    const numbers = Array.from({length: 9}, (_, i) => i + 1);
    // 随机打乱数字顺序
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    for (const num of numbers) {
      if (isValid(grid, pos, num)) {
        grid[pos] = num;
        if (fillGrid(pos + 1)) return true;
        grid[pos] = 0;
      }
    }

    return false;
  }

  fillGrid(0);
  return grid;
}

/**
 * 检查数独是否只有唯一解
 * @param {number[]} puzzle 
 * @returns {boolean}
 */
function hasUniqueSolution(puzzle) {
  let solutions = 0;
  const grid = [...puzzle];

  function solve(pos) {
    if (solutions > 1) return;
    if (pos === 81) {
      solutions++;
      return;
    }

    if (grid[pos] !== 0) {
      solve(pos + 1);
      return;
    }

    for (let num = 1; num <= 9; num++) {
      if (isValid(grid, pos, num)) {
        grid[pos] = num;
        solve(pos + 1);
        grid[pos] = 0;
      }
    }
  }

  solve(0);
  return solutions === 1;
}


/**
 *生成数独谜面
 * @param {number} seed 
 * @param {number} holes 
 * @param {number[]} grid 
 * @returns {number[]}
 */
export function generateQuest(seed, holes, grid) {
  const random = mulberry(seed);
  const puzzle = [...grid];
  const positions = Array.from({length: 81}, (_, i) => i);

  // 随机打乱位置顺序
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  let holesCreated = 0;
  for (const pos of positions) {
    if (holesCreated >= holes) break;

    const temp = puzzle[pos];
    puzzle[pos] = 0;

    if (hasUniqueSolution(puzzle)) {
      holesCreated++;
    } else {
      puzzle[pos] = temp;
    }
  }

  return puzzle;
}

/**
 * 
 * @param {number[]} grid 
 * @param {number[]} occupied 
 * @returns {pos: number, num: number}
 */
export function solveNext(grid, occupied) {
    // 遍历所有格子
    for (let pos = 0; pos < 81; pos++) {
        // 跳过已填数字
        if (grid[pos] !== 0) continue;
        
        // 获取当前格子可用数字的掩码
        let available = ~occupied[pos] & 0x1FF;
        // 如果只有一个数字可用（Naked Single）
        if ((available & (available - 1)) === 0 && available !== 0) {
            return {
                pos: pos,
                num: Math.log2(available) + 1
            };
        }
    }

    // 检查行、列、宫的Hidden Single
    for (let pos = 0; pos < 81; pos++) {
        if (grid[pos] !== 0) continue;

        const row = Math.floor(pos / 9);
        const col = pos % 9;
        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);

        // 获取当前格子可用数字
        let available = ~occupied[pos] & 0x1FF;

        // 检查行
        for (let c = 0; c < 9; c++) {
            const p = row * 9 + c;
            if (p !== pos && grid[p] === 0) {
                available &= occupied[p];
            }
        }
        if ((available & (available - 1)) === 0 && available !== 0) {
            return {
                pos: pos,
                num: Math.log2(available) + 1
            };
        }

        // 检查列
        available = ~occupied[pos] & 0x1FF;
        for (let r = 0; r < 9; r++) {
            const p = r * 9 + col;
            if (p !== pos && grid[p] === 0) {
                available &= occupied[p];
            }
        }
        if ((available & (available - 1)) === 0 && available !== 0) {
            return {
                pos: pos,
                num: Math.log2(available) + 1
            };
        }

        // 检查宫
        available = ~occupied[pos] & 0x1FF;
        const boxRow = Math.floor(box / 3) * 3;
        const boxCol = (box % 3) * 3;
        for (let i = 0; i < 9; i++) {
            const p = (boxRow + Math.floor(i / 3)) * 9 + (boxCol + (i % 3));
            if (p !== pos && grid[p] === 0) {
                available &= occupied[p];
            }
        }
        if ((available & (available - 1)) === 0 && available !== 0) {
            return {
                pos: pos,
                num: Math.log2(available) + 1
            };
        }
    }

    // 没有找到可填写的数字
    return { pos: -1, num: -1 };
}
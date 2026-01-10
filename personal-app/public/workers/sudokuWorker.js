self.onmessage = e => {
  const { gridSize } = e.data;

  function initiateBitmasks(grid, LEN, N) {
    const mMask = Array(LEN).fill(0);
    const nMask = Array(LEN).fill(0);
    const bMask = Array(LEN).fill(0);

    for (let m = 0; m < LEN; m++) {
      for (let n = 0; n < LEN; n++) {
        const num = grid[m][n];
        if (num > 0) {
          const bit = 1 << num;
          mMask[m] |= bit;
          nMask[n] |= bit;
          bMask[Math.floor(m / N) * N + Math.floor(n / N)] |= bit;
        }
      }
    }

    return [mMask, nMask, bMask];
  }

  function builder(grid, mMask, nMask, bMask, LEN, N, FULL, m = 0, n = 0) {
    while (m < LEN && grid[m][n] > 0) {
      n++;
      if (n === LEN) {
        m++;
        n = 0;
      }
    }
    if (m === LEN) return true;

    const b = Math.floor(m / N) * N + Math.floor(n / N);
    let free = FULL & ~(mMask[m] | nMask[n] | bMask[b]);

    const bits = [];
    while (free) {
      const bit = free & -free;
      free ^= bit;
      bits.push(bit);
    }

    bits.sort(() => Math.random() - 0.5); // shuffle

    for (const bit of bits) {
      grid[m][n] = Math.log2(bit) | 0;
      mMask[m] |= bit;
      nMask[n] |= bit;
      bMask[b] |= bit;

      if (builder(grid, mMask, nMask, bMask, LEN, N, FULL, m, n)) return true;

      grid[m][n] = 0;
      mMask[m] ^= bit;
      nMask[n] ^= bit;
      bMask[b] ^= bit;
    }

    return false;
  }

  function solver(grid, mMask, nMask, bMask, LEN, N, FULL, m = 0, n = 0, found = false) {
    while (m < LEN && grid[m][n] > 0) {
      n++;
      if (n === LEN) {
        m++;
        n = 0;
      }
    }
    if (m === LEN) return found ? [true, false] : [true, true];

    const b = Math.floor(m / N) * N + Math.floor(n / N);
    let free = FULL & ~(mMask[m] | nMask[n] | bMask[b]);

    while (free) {
      const bit = free & -free;
      free ^= bit;
      grid[m][n] = Math.log2(bit) | 0;
      mMask[m] |= bit;
      nMask[n] |= bit;
      bMask[b] |= bit;

      const [foundNext, unique] = solver(grid, mMask, nMask, bMask, LEN, N, FULL, m, n, found);

      grid[m][n] = 0;
      mMask[m] ^= bit;
      nMask[n] ^= bit;
      bMask[b] ^= bit;

      if (!unique) return [true, false];
      found = found || foundNext;
    }

    return [found, true];
  }

  function remover(grid, mMask, nMask, bMask, LEN, N, FULL, NUM_REMOVALS) {
    const cells = [];
    for (let m = 0; m < LEN; m++) for (let n = 0; n < LEN; n++) cells.push([m, n]);
    cells.sort(() => Math.random() - 0.5);

    let counter = NUM_REMOVALS;
    const startTime = Date.now();

    for (const [m, n] of cells) {
      if (counter === 0 || (Date.now() - startTime) / 1000 > 5) break;

      const b = Math.floor(m / N) * N + Math.floor(n / N);
      const num = grid[m][n];
      const bit = 1 << num;

      grid[m][n] = 0;
      mMask[m] ^= bit;
      nMask[n] ^= bit;
      bMask[b] ^= bit;

      let valid = true;
      outer: for (let i = 0; i < LEN; i++) {
        for (let j = 0; j < LEN; j++) {
          if (grid[i][j] === 0) {
            const box = Math.floor(i / N) * N + Math.floor(j / N);
            const free = FULL & ~(mMask[i] | nMask[j] | bMask[box]);
            if (free === 0) {
              valid = false;
              break outer;
            }
          }
        }
      }

      if (valid) {
        const [found, unique] = solver(grid, mMask, nMask, bMask, LEN, N, FULL);
        if (!found || !unique) valid = false;
      }

      if (!valid) {
        grid[m][n] = num;
        mMask[m] |= bit;
        nMask[n] |= bit;
        bMask[b] |= bit;
      } else {
        counter--;
      }
    }
  }

  function generateSudoku(N) {
    const LEN = N * N;
    const FULL = (1 << (LEN + 1)) - 2;
    const NUM_GRIDS = LEN * LEN;
    const NUM_REMOVALS = NUM_GRIDS - Math.floor(NUM_GRIDS / 4);

    const grid = Array.from({ length: LEN }, () => Array(LEN).fill(0));
    const [mMask, nMask, bMask] = initiateBitmasks(grid, LEN, N);

    builder(grid, mMask, nMask, bMask, LEN, N, FULL);
    const answerGrid = grid.map(row => [...row]);
    remover(grid, mMask, nMask, bMask, LEN, N, FULL, NUM_REMOVALS);

    answerGrid.forEach((row) => console.log(row))


    return [grid, answerGrid, mMask, nMask, bMask];
  }

  const result = generateSudoku(gridSize);
  self.postMessage(result);
};

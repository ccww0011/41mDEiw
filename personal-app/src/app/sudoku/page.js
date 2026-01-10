"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";


export default function SudokuPage() {
  const [gridSize, setGridSize] = useState(3);
  const [puzzle, setPuzzle] = useState([]);
  const [answer, setAnswer] = useState([]);
  const [userGrid, setUserGrid] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showHint, setShowHint] = useState(false);

  const [mMask, setMMask] = useState([]);
  const [nMask, setNMask] = useState([]);
  const [bMask, setBMask] = useState([]);

  const [candidateFilter, setCandidateFilter] = useState(new Set());
  const [usedHints, setUsedHints] = useState(0);

  const LEN = gridSize * gridSize;
  const hintLimit = gridSize - 1;
  const [hintedCells, setHintedCells] = useState(new Set());


  const generate = () => {
    setLoading(true);
    const worker = new Worker("/workers/sudokuWorker.js", { type: "module" });
    worker.postMessage({ gridSize });
    worker.onmessage = e => {
      const [newPuzzle, newAnswer, newMMask, newNMask, newBMask] = e.data;
      setPuzzle(newPuzzle);
      setAnswer(newAnswer);
      setUserGrid(newPuzzle.map(row => [...row]));
      setMMask(newMMask);
      setNMask(newNMask);
      setBMask(newBMask);

      setShowHint(false);
      setCandidateFilter(new Set());
      setUsedHints(0);
      setMsg("");

      setLoading(false);
      worker.terminate();
    };
  };

  useEffect(() => {
    generate();
  }, [gridSize]);

  // Compute candidates
  const getCandidates = (row, col) => {
    if (
      !puzzle[row] ||
      !userGrid[row] ||
      puzzle[row][col] === undefined
    ) {
      return [];
    }

    if (puzzle[row][col] > 0) return [];

    const FULL = (1 << (LEN + 1)) - 2;
    const box =
      Math.floor(row / gridSize) * gridSize +
      Math.floor(col / gridSize);

    let usedMask = 0;

    for (let i = 0; i < LEN; i++) {
      const rowVal = userGrid[row]?.[i] ?? 0;
      const colVal = userGrid[i]?.[col] ?? 0;
      if (rowVal > 0) usedMask |= 1 << rowVal;
      if (colVal > 0) usedMask |= 1 << colVal;
    }

    const br = Math.floor(row / gridSize) * gridSize;
    const bc = Math.floor(col / gridSize) * gridSize;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const val = userGrid[br + r]?.[bc + c] ?? 0;
        if (val > 0) usedMask |= 1 << val;
      }
    }

    const free = FULL & ~(mMask[row] | nMask[col] | bMask[box] | usedMask);

    const candidates = [];
    let temp = free;
    while (temp) {
      const bit = temp & -temp;
      temp ^= bit;
      candidates.push(Math.log2(bit) | 0);
    }

    return candidates;
  };

  // Input handling
  const handleInput = (row, col, value) => {
    const val = parseInt(value) || 0;
    setUserGrid(prev => {
      const copy = prev.map(r => [...r]);
      copy[row][col] = val;
      return copy;
    });
  };

  // Hint reveal
  const revealHint = (row, col) => {
    if (usedHints >= hintLimit) {
      setMsg(`No hints left (${hintLimit})`);
      return;
    }
    if (puzzle[row][col] > 0) return;

    setUserGrid(prev => {
      const copy = prev.map(r => [...r]);
      copy[row][col] = answer[row][col];
      return copy;
    });

    setPuzzle(prev => {
      const copy = prev.map(r => [...r]);
      copy[row][col] = answer[row][col];
      return copy;
    });

    setHintedCells(prev => new Set(prev).add(`${row}-${col}`)); // add this
    setUsedHints(h => h + 1);
  };


  // Submit
  const handleSubmit = () => {
    let correct = true;
    for (let i = 0; i < LEN; i++) {
      for (let j = 0; j < LEN; j++) {
        if (userGrid[i][j] !== answer[i][j]) correct = false;
      }
    }
    setMsg(correct ? "Congratulations!" : "Some cells are wrong.");
  };

  return (
    <div className="container">
      {/* Controls */}
      <div className="grid">
        <div className="grid-item grid2"><h2>Sudoku</h2></div>
        <div className="grid-item grid2">
          <select
            value={gridSize}
            onChange={e => setGridSize(+e.target.value)}
            disabled={loading}
          >
            <option value={2}>Easy 4x4</option>
            <option value={3}>Hard 9x9</option>
            <option value={4}>Extreme 16x16</option>
          </select>
        </div>
        <div className="grid-item grid2">
          <button onClick={generate} disabled={loading}>Generate</button>
        </div>
        <div className="grid-item grid2"></div>
        <div className="grid-item grid2">
          <button onClick={() => setShowHint(v => !v)} disabled={loading}>
            {showHint ? "Hide Hint" : "Show Hint"}
          </button>
        </div>
        <div className="grid-item grid2">
          <button onClick={handleSubmit} disabled={loading}>Submit</button>
        </div>
      </div>

      {/* Tables */}
      <div className={styles.sudokuContainer}>
        {/* Main Sudoku Table */}
        <div className={styles.sudokuWrapper}>
          {loading ? (
            <div className={styles.sudokuLoading}>Loading Sudoku... This may take a few seconds.</div>
          ) : (
            <div className={styles.sudokuWrapper} style={{ flexDirection: "column", alignItems: "center" }}>
              <div style={{ textAlign: "center", marginTop: 5 }}>
                {showHint ? <p> Click on a cell in the right gird to reveal the answer on that cell. Hints left: {hintLimit - usedHints}</p> : <p>Enjoy!</p>}
              </div>

              <table className={styles.sudokuTable}>
                <tbody>
                {puzzle.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => {
                      const isFixed = cell > 0;
                      const subgridRight =
                        (c + 1) % gridSize === 0 && c !== puzzle.length - 1;
                      const subgridBottom =
                        (r + 1) % gridSize === 0 && r !== puzzle.length - 1;

                      return (
                        <td
                          key={c}
                          className={`${styles.sudokuCell} ${isFixed ? styles.sudokuCellFixed : ""} ${subgridRight ? styles.subgridBorderRight : ""} ${subgridBottom ? styles.subgridBorderBottom : ""}`}
                          style={{backgroundColor: hintedCells.has(`${r}-${c}`) ? "#fee6ce" : undefined}}
                        >
                          {isFixed ? (
                            <span>{cell}</span>
                          ) : (
                            <input
                              type="number"
                              min="1"
                              max={LEN}
                              value={userGrid[r][c] || ""}
                              onChange={e => handleInput(r, c, e.target.value)}
                              data-row={r}
                              data-col={c}
                              className={styles.sudokuInput}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Candidates Section */}
        {showHint && !loading && puzzle.length > 0 && userGrid.length > 0 && (
          <div className={styles.sudokuWrapper} style={{flexDirection: "column", alignItems: "center"}}>

            {/* Candidate Filter Buttons */}
            <div style={{marginBottom: "8px", display: "flex", justifyContent: "center", flexWrap: "wrap", alignItems: "center"}}>
              <button style={{width: "50px"}} onClick={() => setCandidateFilter(new Set())}>
                ALL
              </button>
              {Array.from({ length: gridSize * gridSize }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setCandidateFilter((prev) => {
                      const next = new Set(prev);
                      next.has(n) ? next.delete(n) : next.add(n);
                      return next;
                    })
                  }
                  style={{
                    width: "35px",
                    backgroundColor: candidateFilter.has(n) ? "#08519c" : "",
                    color: candidateFilter.has(n) ? "#f7fbff" : "",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Candidate Grid Table */}
            <table className={styles.sudokuTable}>
              <tbody>
              {puzzle.map((row, r) => (
                <tr key={r}>
                  {row.map((_, c) => {
                    let candidates = userGrid[r][c] === 0 ? getCandidates(r, c) : [];
                    if (candidateFilter.size) {
                      candidates = candidates.filter((n) => candidateFilter.has(n));
                    }

                    // Split candidates into rows of 4
                    const rows = [];
                    for (let i = 0; i < candidates.length; i += 4) {
                      rows.push(candidates.slice(i, i + 4));
                    }

                    // Subgrid borders like main table
                    const subgridRight = (c + 1) % gridSize === 0 && c !== puzzle.length - 1;
                    const subgridBottom = (r + 1) % gridSize === 0 && r !== puzzle.length - 1;

                    return (
                      <td
                        key={c}
                        className={`${styles.sudokuCell} ${subgridRight ? styles.subgridBorderRight : ""} ${subgridBottom ? styles.subgridBorderBottom : ""}`}
                        onClick={() => {
                          if (showHint) revealHint(r, c);
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)", // 4 numbers per row
                            fontSize: "12px",
                            color: "red",
                            lineHeight: 1,
                            textAlign: "center",
                            gap: "0px",
                            cursor: "pointer",
                          }}
                        >
                          {rows.flat().map((n, idx) => (
                            <span key={idx} onClick={() => revealHint(r, c)}>
                        {n}
                      </span>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      <div style={{paddingTop: 10, textAlign: "center", color: "red" }}>
        {msg}
      </div>
    </div>
  );
}

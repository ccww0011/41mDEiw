"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";


export default function SudokuPage() {
  const [gridSize, setGridSize] = useState(3);
  const [puzzle, setPuzzle] = useState([]);
  const [answer, setAnswer] = useState([]);
  const [userGrid, setUserGrid] = useState([]);

  const [mMask, setMMask] = useState([]);
  const [nMask, setNMask] = useState([]);
  const [bMask, setBMask] = useState([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [usedHints, setUsedHints] = useState(0);

  const [candidateFilter, setCandidateFilter] = useState(new Set());

  const LEN = gridSize * gridSize;
  const hintLimit = gridSize - 1;
  const [hintedCells, setHintedCells] = useState(new Set());


  const workerRef = React.useRef(null);

  // Auto-clear temporary messages (like "Some cells are wrong") after 3 seconds
  useEffect(() => {
    if (!msg) return;
    const timer = setTimeout(() => setMsg(""), 3000); // 3 seconds
    return () => clearTimeout(timer);
  }, [msg]);


  const generate = () => {
    setLoading(true);

    // terminate previous worker if exists
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    const worker = new Worker("/workers/sudokuWorker.js", { type: "module" });
    workerRef.current = worker;

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
      setHintedCells(new Set());
      setMsg("");

      setLoading(false);
      worker.terminate();
      workerRef.current = null;
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

  // Move focus to next cell with arrow keys
  const handleKeyDown = (e, row, col) => {
    const key = e.key;
    let nr = row;
    let nc = col;
    const moveToCell = (r, c) => {
      const td = document.querySelector(`td[data-row="${r}"][data-col="${c}"]`);
      if (!td) return;

      const input = td.querySelector("input");
      if (input) input.focus();
      else td.focus(); // fixed cell
    };
    switch (key) {
      case "ArrowUp":
        nr = row - 1 < 0 ? LEN - 1 : row - 1;
        break;
      case "ArrowDown":
        nr = (row + 1) % LEN;
        break;
      case "ArrowLeft":
        nc = col - 1 < 0 ? LEN - 1 : col - 1;
        break;
      case "ArrowRight":
        nc = (col + 1) % LEN;
        break;
      default:
        return;
    }
    e.preventDefault();
    moveToCell(nr, nc);
  };

  // Hint reveal
  const revealHint = (row, col) => {
    const key = `${row}-${col}`;

    setUsedHints(prevHints => {
      if (hintedCells.has(key)) return prevHints;
      if (prevHints >= hintLimit) {
        setMsg(`No hints left (${hintLimit})`);
        return hintLimit;
      }

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

      // Add to hinted cells safely
      setHintedCells(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      return prevHints + 1;
    });
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

  const topMessage = msg || (loading ? "Loading Sudoku... This may take a few seconds." : "Enjoy!");


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

      {/* Main Container: Filters + Grid & Message */}
      <div className={styles.sudokuContainer}>

        {/* Left Column: Vertical candidate buttons */}
        {showHint && !loading && (
          <div style={{ width: "50px", display: "flex", flexDirection: "column" }}>

            {/* ALL button (first) */}
            <button
              onClick={() => setCandidateFilter(new Set())}
              style={{
                width: "100%",
                height: "40px",
                fontSize: "18px",
                backgroundColor: candidateFilter.size === 0 ? "#d94801" : "#fdae6b",
                color: candidateFilter.size === 0 ? "#fff" : "#4d2600",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={e => {
                if (candidateFilter.size !== 0) {
                  e.currentTarget.style.backgroundColor = "#d94801";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={e => {
                if (candidateFilter.size !== 0) {
                  e.currentTarget.style.backgroundColor = "#fdae6b";
                  e.currentTarget.style.color = "#4d2600";
                }
              }}
            >
              ALL
            </button>

            {/* Number buttons */}
            {Array.from({ length: gridSize * gridSize }, (_, i) => i + 1).map((n) => {
              const selected = candidateFilter.has(n);
              return (
                <button
                  key={n}
                  onClick={() =>
                    setCandidateFilter(prev => {
                      const next = new Set(prev);
                      next.has(n) ? next.delete(n) : next.add(n);
                      return next;
                    })
                  }
                  style={{
                    width: "100%",
                    height: "40px",
                    fontSize: "18px",
                    backgroundColor: selected ? "#d94801" : "#fdae6b",
                    color: selected ? "#fff" : "#4d2600",
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={e => {
                    if (!selected) {
                      e.currentTarget.style.backgroundColor = "#d94801";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!selected) {
                      e.currentTarget.style.backgroundColor = "#fdae6b";
                      e.currentTarget.style.color = "#4d2600";
                    }
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}

        {/* Right Column: Message + Sudoku grid */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Message line (unified) */}
          <div
            style={{
              height: "40px",
              minWidth: "400px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <h4>{topMessage}</h4>
          </div>

          {/* Sudoku grid */}
          <div className={styles.sudokuWrapper} style={{ flexDirection: "column", alignItems: "center" }}>
            <table className={styles.sudokuTable}>
              <tbody>
              {(loading ? Array.from({ length: LEN }, () => Array.from({ length: LEN })) : puzzle).map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => {
                    const isFixed = !loading && cell > 0;
                    const subgridRight = (c + 1) % gridSize === 0 && c !== (loading ? LEN : puzzle.length) - 1;
                    const subgridBottom = (r + 1) % gridSize === 0 && r !== (loading ? LEN : puzzle.length) - 1;

                    return (
                      <td
                        key={c}
                        className={`${styles.sudokuCell} ${isFixed ? styles.sudokuCellFixed : ""} ${subgridRight ? styles.subgridBorderRight : ""} ${subgridBottom ? styles.subgridBorderBottom : ""}`}
                        style={{
                          position: "relative",
                          backgroundColor: !loading && hintedCells.has(`${r}-${c}`) ? "#fee6ce" : undefined,
                        }}
                        data-row={r}
                        data-col={c}
                        tabIndex={0}
                        onKeyDown={e => handleKeyDown(e, r, c)} // Arrow keys
                      >
                        {!loading ? (
                          isFixed ? (
                            <span style={{display: "flex", justifyContent: "center", alignItems: "center", height: "100%"}}>{cell}</span>
                          ) : (
                            <>
                              <input
                                type="number"
                                min="1"
                                max={LEN}
                                value={userGrid[r][c] || ""}
                                onChange={e => handleInput(r, c, e.target.value)}
                                data-row={r}
                                data-col={c}
                                className={styles.sudokuInput}
                                tabIndex={0}
                              />

                              {showHint && userGrid[r][c] === 0 && (
                                <div
                                  className={styles.candidatesOverlay}
                                  style={{
                                    gridTemplateColumns: `repeat(4, 1fr)`,
                                  }}
                                >
                                  {getCandidates(r, c)
                                    .filter(n => candidateFilter.size === 0 || candidateFilter.has(n))
                                    .map((n, idx) => (
                                      <span key={idx}>{n}</span>
                                    ))}
                                </div>
                              )}
                            </>
                          )
                        ) : (
                          <span>&nbsp;</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* NEW: Hint candidate grid */}
        {showHint && !loading && (
          <div className={styles.hintGridWrapper}>
            <div
              style={{
                height: "40px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <h4>Click to reveal answer.</h4>
            </div>

            <table className={styles.hintSudokuTable}>
              <tbody>
              {puzzle.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => {
                    const disabled =
                      cell > 0 ||
                      userGrid[r][c] > 0 ||
                      getCandidates(r, c).length === 0;

                    const subgridRight =
                      (c + 1) % gridSize === 0 && c !== puzzle.length - 1;
                    const subgridBottom =
                      (r + 1) % gridSize === 0 && r !== puzzle.length - 1;

                    return (
                      <td
                        key={c}
                        className={`${styles.hintSudokuCell}
                  ${subgridRight ? styles.subgridBorderRight : ""}
                  ${subgridBottom ? styles.subgridBorderBottom : ""}`}
                      >
                        <button
                          className={styles.hintCellButton}
                          disabled={disabled}
                          onClick={() => revealHint(r, c)}
                        >
                          ?
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              </tbody>
            </table>

            <div
              style={{
                height: "40px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <h4>Hints left: {hintLimit - usedHints}</h4>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

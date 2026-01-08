"use client";

import React, { useState, useEffect } from "react";
import { generateSudokuAsync } from "@/hooks/useSudoku";
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

  // Generate puzzle
  const generate = async () => {
    setLoading(true);
    const [newPuzzle, newAnswer, newMMask, newNMask, newBMask] = await generateSudokuAsync(gridSize);
    setPuzzle(newPuzzle);
    setAnswer(newAnswer);
    setUserGrid(newPuzzle.map((row) => [...row]));
    setMMask(newMMask);
    setNMask(newNMask);
    setBMask(newBMask);
    setShowHint(false);
    setLoading(false);
    setMsg("");
  };

  useEffect(() => {
    generate();
  }, [gridSize]);

  // Compute candidates for a cell
  const getCandidates = (row, col) => {
    if (puzzle[row][col] > 0) return []; // fixed cells have no candidates

    const LEN = gridSize * gridSize;
    const FULL = (1 << (LEN + 1)) - 2;
    const box = Math.floor(row / gridSize) * gridSize + Math.floor(col / gridSize);

    let usedMask = 0;

// Include user's inputs in the mask
    for (let i = 0; i < LEN; i++) {
      if (userGrid[row][i] > 0) usedMask |= 1 << userGrid[row][i]; // row
      if (userGrid[i][col] > 0) usedMask |= 1 << userGrid[i][col]; // column
    }

    const boxStartRow = Math.floor(row / gridSize) * gridSize;
    const boxStartCol = Math.floor(col / gridSize) * gridSize;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const val = userGrid[boxStartRow + r][boxStartCol + c];
        if (val > 0) usedMask |= 1 << val;
      }
    }

    let free = FULL & ~(mMask[row] | nMask[col] | bMask[box] | usedMask);


    const candidates = [];
    while (free) {
      const bit = free & -free;
      free ^= bit;
      candidates.push(Math.log2(bit) | 0);
    }
    return candidates;
  };

  // Input handling
  const handleInput = (row, col, value) => {
    const val = parseInt(value) || 0;
    setUserGrid((prev) => {
      const copy = prev.map((r) => [...r]);
      copy[row][col] = val;
      return copy;
    });
  };

  const handleKeyDown = (e, row, col) => {
    const total = gridSize * gridSize;
    if (e.key === "Tab") {
      e.preventDefault();
      let nextRow = row;
      let nextCol = col;
      const direction = e.shiftKey ? -1 : 1;

      while (true) {
        nextCol += direction;
        if (nextCol >= total) {
          nextCol = 0;
          nextRow = (nextRow + 1) % total;
        } else if (nextCol < 0) {
          nextCol = total - 1;
          nextRow = (nextRow - 1 + total) % total;
        }

        const nextInput = document.querySelector(
          `input[data-row='${nextRow}'][data-col='${nextCol}']`
        );
        if (nextInput) {
          nextInput.focus();
          break;
        }
        if (nextRow === row && nextCol === col) break;
      }
    }
  };

  const handleSubmit = () => {
    let correct = true;
    for (let i = 0; i < puzzle.length; i++) {
      for (let j = 0; j < puzzle.length; j++) {
        if (userGrid[i][j] !== answer[i][j]) correct = false;
      }
    }
    setMsg(correct ? "Congratulations! Sudoku is correct!" : "Some cells are wrong.");
  };

  return (
    <div className="container">
      <div className="grid">
        <div className="grid-item grid2">
          <h2>Sudoku</h2>
        </div>
        <div className="grid-item grid2">
          <select
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            disabled={loading}
          >
            <option value={2}>4x4</option>
            <option value={3}>9x9</option>
            <option value={4}>16x16</option>
          </select>
        </div>
        <div className="grid-item grid2">
          <button onClick={generate} disabled={loading}>
            Generate New
          </button>
        </div>
        <div className="grid-item grid2"></div>
        <div className="grid-item grid2">
          <button onClick={() => setShowHint(!showHint)} disabled={loading}>
            {showHint ? "Hide Hint" : "Show Hint"}
          </button>
        </div>
        <div className="grid-item grid2">
          <button onClick={handleSubmit} disabled={loading}>
            Submit
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "40px", marginTop: "20px" }}>
        {/* Main Sudoku Table */}
        <div className={styles.sudokuWrapper}>
          {loading ? (
            <div className={styles.sudokuLoading}>Loading Sudoku...</div>
          ) : (
            <table className={styles.sudokuTable}>
              <tbody>
              {puzzle.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => {
                    const isFixed = cell > 0;
                    const subgridRight =
                      (colIndex + 1) % gridSize === 0 &&
                      colIndex !== puzzle.length - 1;
                    const subgridBottom =
                      (rowIndex + 1) % gridSize === 0 &&
                      rowIndex !== puzzle.length - 1;
                    return (
                      <td
                        key={colIndex}
                        className={`${styles.sudokuCell} ${
                          isFixed ? styles.sudokuCellFixed : ""
                        } ${subgridRight ? styles.subgridBorderRight : ""} ${
                          subgridBottom ? styles.subgridBorderBottom : ""
                        }`}
                      >
                        {isFixed ? (
                          <span className={styles.sudokuNumber}>{cell}</span>
                        ) : (
                          <input
                            type="number"
                            min="1"
                            max={gridSize * gridSize}
                            value={userGrid[rowIndex][colIndex] || ""}
                            onChange={(e) =>
                              handleInput(rowIndex, colIndex, e.target.value)
                            }
                            onKeyDown={(e) =>
                              handleKeyDown(e, rowIndex, colIndex)
                            }
                            data-row={rowIndex}
                            data-col={colIndex}
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
          )}
        </div>

        {/* Candidates Table */}
        {showHint && (
          <div className={styles.sudokuWrapper}>
            <table className={styles.sudokuTable}>
              <tbody>
              {puzzle.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => {
                    const candidates = userGrid[rowIndex][colIndex] === 0
                      ? getCandidates(rowIndex, colIndex)
                      : [];
                    const subgridRight =
                      (colIndex + 1) % gridSize === 0 &&
                      colIndex !== puzzle.length - 1;
                    const subgridBottom =
                      (rowIndex + 1) % gridSize === 0 &&
                      rowIndex !== puzzle.length - 1;

                    // Split candidates into rows of 4 numbers
                    const rows = [];
                    for (let i = 0; i < candidates.length; i += 4) {
                      rows.push(candidates.slice(i, i + 4));
                    }

                    return (
                      <td
                        key={colIndex}
                        className={`${styles.sudokuCell} ${
                          subgridRight ? styles.subgridBorderRight : ""
                        } ${subgridBottom ? styles.subgridBorderBottom : ""}`}
                      >
                        <div
                          style={{
                            margin: 0,
                            border: 0,
                            padding: 0,

                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            fontSize: "12px",
                            color: "red",
                            lineHeight: "1",
                            textAlign: "center",
                            gap: 0,
                          }}
                        >
                          {rows.flat().map((num, idx) => (
                            <span key={idx}>{num}</span>
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

      <div style={{ paddingTop: "10px", textAlign: "center", color: "red" }}>
        <p>{msg}</p>
      </div>
    </div>
  );
}

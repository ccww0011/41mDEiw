'use client';

import React, {useEffect, useRef, useState} from "react";
import { postTransactionAI } from "@/hooks_protected/useTransactionAI";
import styles from "./TransactionsAI.module.css";
import {useTransactions} from "@/context/TransactionContext";

export default function TransactionAI() {
  const {setTransactions} = useTransactions();

  const [userText, setUserText] = useState("");
  const [messages, setMessages] = useState([
    { from: "ai", text: "Welcome! Please enter a transaction instruction to get started." },
    { from: "ai", text: "Sample: buy 10 shares of AAPL on 2026-01-02 at $150" }
  ]);

  const [incompleteTransactions, setIncompleteTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatWindowRef = useRef(null);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!userText.trim() || loading) return;

    setMessages((prev) => [...prev, { from: "user", text: userText }]);
    setLoading(true);

    await postTransactionAI(
      {
        user_text: userText,
        prev_incomplete_transactions: incompleteTransactions
      },
      setMessages,
      setIncompleteTransactions,
      setTransactions
    );
    setUserText("");
    setLoading(false);
  };

  // Handle Enter key (send) without Shift
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <h2>Add Transactions</h2>
      <div className="grid">
        <div className="grid-item grid6">
          <div className={styles.chatWindow} ref={chatWindowRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.chatMessage} ${msg.from === "user" ? styles.user : styles.ai}`}>
                {msg.text}
              </div>
            ))}
          </div>
        </div>

        <div className="grid-item grid6">
          <textarea
            className={styles.textareaInput}
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter transaction instructions..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || !userText.trim()}>
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>


    </>
  );
}

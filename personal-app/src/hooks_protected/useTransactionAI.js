'use client';

import { logout } from "@/hooks_protected/useAuth";
import {getTransactions} from "@/hooks_protected/useTransactionDatabase";

export async function transactionAI(method, body, setMessages, setIncompleteTransactions, setTransactions) {
  try {
    const options = {
      method,
      headers: { "content-type": "application/json" },
      credentials: "include"
    };
    if (method !== "GET" && body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(
      process.env.NEXT_PUBLIC_AUTHENTICATED_URL + "/api/transaction/ai",
      options
    );
    const result = await response.json();
    if (response.ok) {
      if (result?.saved?.length) {
        const messageText = result.saved
          .map((message, index) => `${index + 1}. ${message}`)
          .join("\n")
          .replace(/^"|"$/g, "")
          .trim();
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: `Saved transactions:\n${messageText}`
          }
        ]);
        await getTransactions(setTransactions);
      }

      if (result?.incomplete?.length) {
        setIncompleteTransactions(result.incomplete);
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: result.clarification_prompt || "Some transactions need more info."
          }
        ]);
      } else {
        setIncompleteTransactions([]);
      }
      return { status: "Success", message: result.message };
    }
    if (response.status === 401 || response.status === 403) {
      logout();
      return { status: "Unauthorised", message: "Unauthorised." };
    }
    setMessages((prev) => [
      ...prev,
      { from: "ai", text: "Chatbot error, please try again later." }
    ]);
    return { status: "Error", message: "Chatbot error, please try again later." };
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      { from: "ai", text: "Chatbot error, please try again later." }
    ]);
    return { status: "Error", message: error.message };
  }
}

export async function postTransactionAI(body, setMessages, setIncompleteTransactions, setTransactions) {
  return transactionAI("POST", body, setMessages, setIncompleteTransactions, setTransactions);
}

export async function putTransactionAI(body, setMessages, setIncompleteTransactions) {
  return transactionAI("PUT", body, setMessages, setIncompleteTransactions);
}


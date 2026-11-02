import { useState } from "react";
import { Chat } from "./Chat";
import { History } from "./History";
import "./App.css";

const newThreadId = () => crypto.randomUUID();

export default function App() {
  const [tab, setTab] = useState<"chat" | "history">("chat");
  const [threadId, setThreadId] = useState(newThreadId);
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <div className="app">
      <header>
        <h1>agui chat</h1>
        <nav>
          <button className={tab === "chat" ? "tab active" : "tab"} onClick={() => setTab("chat")}>Chat</button>
          <button
            className={tab === "history" ? "tab active" : "tab"}
            onClick={() => { setHistoryKey((k) => k + 1); setTab("history"); }}
          >
            History / Replay
          </button>
        </nav>
        {tab === "chat" && (
          <button className="btn secondary" onClick={() => setThreadId(newThreadId())}>New chat</button>
        )}
      </header>
      <main>
        {/* Keep Chat mounted so switching tabs doesn't drop an in-flight conversation. */}
        <div hidden={tab !== "chat"} className="pane"><Chat key={threadId} threadId={threadId} /></div>
        {tab === "history" && <div className="pane"><History refreshKey={historyKey} /></div>}
      </main>
    </div>
  );
}

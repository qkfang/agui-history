import { useState } from "react";
import type { AgUiMessage } from "@assistant-ui/react-ag-ui";
import { Chat } from "./Chat";
import { History } from "./History";
import { ThreadHistory } from "./ThreadHistory";
import "./App.css";

type Tab = "chat" | "history" | "threads";

const newThreadId = () => crypto.randomUUID();

export default function App() {
  const [tab, setTab] = useState<Tab>("chat");
  const [threadId, setThreadId] = useState<string>(newThreadId);
  const [initialMessages, setInitialMessages] = useState<AgUiMessage[] | undefined>();
  const [historyKey, setHistoryKey] = useState(0);

  const openTab = (t: Tab) => {
    if (t !== "chat") setHistoryKey((k) => k + 1);
    setTab(t);
  };

  return (
    <div className="app">
      <header>
        <h1>agui chat</h1>
        <nav>
          <button className={tab === "chat" ? "tab active" : "tab"} onClick={() => openTab("chat")}>Chat</button>
          <button className={tab === "threads" ? "tab active" : "tab"} onClick={() => openTab("threads")}>
            Thread history
          </button>
          <button className={tab === "history" ? "tab active" : "tab"} onClick={() => openTab("history")}>
            History / Replay
          </button>
        </nav>
        {tab === "chat" && (
          <button
            className="btn secondary"
            onClick={() => { setInitialMessages(undefined); setThreadId(newThreadId()); }}
          >
            New chat
          </button>
        )}
      </header>
      <main>
        {/* Keep Chat mounted so switching tabs doesn't drop an in-flight conversation. */}
        <div hidden={tab !== "chat"} className="pane">
          <Chat key={threadId} threadId={threadId} initialMessages={initialMessages} />
        </div>
        {tab === "history" && <div className="pane"><History refreshKey={historyKey} /></div>}
        {tab === "threads" && (
          <div className="pane">
            <ThreadHistory
              refreshKey={historyKey}
              onContinue={(id, messages) => { setInitialMessages(messages); setThreadId(id); setTab("chat"); }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

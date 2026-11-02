import { useEffect, useState } from "react";
import type { AgUiMessage } from "@assistant-ui/react-ag-ui";
import { getThreadSnapshot, listConversations, type ConversationSummary } from "./api";
import { Chat } from "./Chat";

/** History page that restores a thread from an AG-UI MESSAGES_SNAPSHOT and renders it with the live Chat component. */
export function ThreadHistory({
  refreshKey,
  onContinue,
}: {
  refreshKey: number;
  onContinue: (threadId: string, messages: AgUiMessage[]) => void;
}) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<{ threadId: string; messages: AgUiMessage[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listConversations().then(setItems).catch((e) => setError(String(e)));
  }, [refreshKey]);

  const open = (id: string) =>
    getThreadSnapshot(id)
      .then((s) => setSelected({ threadId: s.threadId, messages: s.messages }))
      .catch((e) => setError(String(e)));

  return (
    <div className="history">
      <aside className="history-list">
        {error && <div className="error">{error}</div>}
        {items.length === 0 && !error && <p className="muted">No saved threads yet.</p>}
        {items.map((c) => (
          <button
            key={c.id}
            className={`history-item ${selected?.threadId === c.id ? "active" : ""}`}
            onClick={() => open(c.id)}
          >
            <div className="history-title">{c.title}</div>
            <div className="muted">{new Date(c.updatedAt).toLocaleString()} · {c.messageCount} msgs</div>
          </button>
        ))}
      </aside>
      <section className="history-detail thread-detail">
        {selected ? (
          <>
            <div className="replay-controls">
              <button className="btn" onClick={() => onContinue(selected.threadId, selected.messages)}>
                Continue this chat
              </button>
              <span className="muted">Restored from AG-UI MESSAGES_SNAPSHOT · {selected.messages.length} messages</span>
            </div>
            <div className="thread-body">
              <Chat key={selected.threadId} threadId={selected.threadId} initialMessages={selected.messages} readOnly />
            </div>
          </>
        ) : (
          <p className="muted">Select a thread to restore it.</p>
        )}
      </section>
    </div>
  );
}

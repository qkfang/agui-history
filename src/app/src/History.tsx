import { useEffect, useRef, useState } from "react";
import { getConversation, listConversations, type Conversation, type ConversationSummary } from "./api";
import { ToolCard } from "./ToolCard";

type Step =
  | { kind: "text"; role: "user" | "assistant"; text: string }
  | { kind: "tool"; name: string; args: unknown; result?: unknown };

function toSteps(c: Conversation): Step[] {
  const steps: Step[] = [];
  const tools = new Map<string, Extract<Step, { kind: "tool" }>>();
  for (const m of c.messages) {
    for (const part of m.contents ?? []) {
      const type = part.$type ?? part.type;
      if (type === "text" && part.text) {
        steps.push({ kind: "text", role: m.role === "user" ? "user" : "assistant", text: part.text });
      } else if (type === "functionCall") {
        const s: Extract<Step, { kind: "tool" }> = { kind: "tool", name: part.name ?? "tool", args: part.arguments };
        if (part.callId) tools.set(part.callId, s);
        steps.push(s);
      } else if (type === "functionResult" && part.callId) {
        const s = tools.get(part.callId);
        if (s) s.result = part.result;
      }
    }
  }
  return steps;
}

function Replay({ conversation }: { conversation: Conversation }) {
  const steps = toSteps(conversation);
  const [shown, setShown] = useState(steps.length);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => {
      setShown((n) => {
        if (n >= steps.length) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer.current);
  }, [playing, steps.length]);

  const play = () => {
    setShown(0);
    setPlaying(true);
  };

  return (
    <div className="replay">
      <div className="replay-controls">
        <button className="btn" onClick={play}>▶ Replay</button>
        <button className="btn secondary" onClick={() => setPlaying((p) => !p)} disabled={shown >= steps.length}>
          {playing ? "Pause" : "Resume"}
        </button>
        <button className="btn secondary" onClick={() => { setPlaying(false); setShown((n) => Math.min(n + 1, steps.length)); }}>
          Step
        </button>
        <button className="btn secondary" onClick={() => { setPlaying(false); setShown(steps.length); }}>
          Show all
        </button>
        <span className="muted">{shown}/{steps.length}</span>
      </div>
      <div className="viewport">
        {steps.slice(0, shown).map((s, i) =>
          s.kind === "text" ? (
            <div key={i} className={`msg ${s.role}`}>{s.text}</div>
          ) : (
            <div key={i} className="msg assistant">
              <ToolCard name={s.name} args={s.args} result={s.result} status={s.result === undefined ? "running" : "complete"} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function History({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listConversations().then(setItems).catch((e) => setError(String(e)));
  }, [refreshKey]);

  const open = (id: string) =>
    getConversation(id).then(setSelected).catch((e) => setError(String(e)));

  return (
    <div className="history">
      <aside className="history-list">
        {error && <div className="error">{error}</div>}
        {items.length === 0 && !error && <p className="muted">No saved conversations yet.</p>}
        {items.map((c) => (
          <button key={c.id} className={`history-item ${selected?.id === c.id ? "active" : ""}`} onClick={() => open(c.id)}>
            <div className="history-title">{c.title}</div>
            <div className="muted">{new Date(c.updatedAt).toLocaleString()} · {c.messageCount} msgs</div>
          </button>
        ))}
      </aside>
      <section className="history-detail">
        {selected ? <Replay key={selected.id} conversation={selected} /> : <p className="muted">Select a conversation to replay.</p>}
      </section>
    </div>
  );
}

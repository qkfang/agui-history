import type { ReactNode } from "react";

export type ToolStatus = "running" | "complete" | "error";

export function ToolCard(props: { name: string; args?: unknown; result?: unknown; status: ToolStatus }): ReactNode {
  const { name, args, result, status } = props;
  const fmt = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));
  return (
    <div className={`agent-card ${status}`}>
      <div className="agent-card-header">
        <span className="agent-card-icon">🛠</span>
        <span className="agent-card-name">{name}</span>
        <span className="agent-card-status">{status === "running" ? "running…" : status}</span>
      </div>
      {args !== undefined && args !== null && (
        <div className="agent-card-section">
          <div className="agent-card-label">Arguments</div>
          <pre>{fmt(args)}</pre>
        </div>
      )}
      {result !== undefined && (
        <div className="agent-card-section">
          <div className="agent-card-label">Result</div>
          <pre>{fmt(result)}</pre>
        </div>
      )}
    </div>
  );
}

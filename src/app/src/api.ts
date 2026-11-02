import type { AgUiMessage } from "@assistant-ui/react-ag-ui";

export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:5134";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface Content {
  $type?: string;
  type?: string;
  text?: string;
  callId?: string;
  name?: string;
  arguments?: unknown;
  result?: unknown;
}

export interface StoredMessage {
  role: string;
  contents?: Content[];
}

export interface Conversation extends ConversationSummary {
  messages: StoredMessage[];
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const r = await fetch(`${API_URL}/api/history`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function getConversation(id: string): Promise<Conversation> {
  const r = await fetch(`${API_URL}/api/history/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** AG-UI MESSAGES_SNAPSHOT event for a stored thread. */
export interface MessagesSnapshot {
  type: "MESSAGES_SNAPSHOT";
  threadId: string;
  messages: AgUiMessage[];
}

export async function getThreadSnapshot(id: string): Promise<MessagesSnapshot> {
  const r = await fetch(`${API_URL}/api/threads/${encodeURIComponent(id)}/snapshot`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

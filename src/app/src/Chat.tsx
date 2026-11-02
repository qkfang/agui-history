import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  ExportedMessageRepository,
  MessagePrimitive,
  ThreadPrimitive,
  type ThreadHistoryAdapter,
} from "@assistant-ui/react";
import { fromAgUiMessages, useAgUiRuntime, type AgUiMessage } from "@assistant-ui/react-ag-ui";
import { HttpAgent } from "@ag-ui/client";
import { useMemo } from "react";
import { API_URL } from "./api";
import { ToolCard } from "./ToolCard";

function UserMessage() {
  return (
    <MessagePrimitive.Root className="msg user">
      <MessagePrimitive.Parts />
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="msg assistant">
      <MessagePrimitive.Parts
        components={{
          tools: {
            Fallback: ({ toolName, args, result, status }) => (
              <ToolCard
                name={toolName}
                args={args}
                result={result}
                status={status.type === "running" ? "running" : status.type === "incomplete" ? "error" : "complete"}
              />
            ),
          },
        }}
      />
    </MessagePrimitive.Root>
  );
}

interface ChatProps {
  threadId: string;
  /** AG-UI messages (e.g. from a MESSAGES_SNAPSHOT) to restore the thread with. */
  initialMessages?: AgUiMessage[];
  readOnly?: boolean;
}

export function Chat({ threadId, initialMessages, readOnly }: ChatProps) {
  const agent = useMemo(() => new HttpAgent({ url: `${API_URL}/agui`, threadId }), [threadId]);
  const history = useMemo<ThreadHistoryAdapter | undefined>(
    () =>
      initialMessages && {
        load: async () => ExportedMessageRepository.fromArray(fromAgUiMessages(initialMessages)),
        append: async () => {},
      },
    [initialMessages],
  );
  const runtime = useAgUiRuntime({ agent, adapters: history ? { history } : undefined });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="thread">
        <ThreadPrimitive.Viewport className="viewport">
          <ThreadPrimitive.Empty>
            <p className="hint">Ask something — try “What's the weather in Sydney and what is 12 * (3 + 4)?”</p>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </ThreadPrimitive.Viewport>
        {!readOnly && (
          <ComposerPrimitive.Root className="composer">
            <ComposerPrimitive.Input className="composer-input" placeholder="Send a message…" autoFocus />
            <ComposerPrimitive.Send className="btn">Send</ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        )}
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

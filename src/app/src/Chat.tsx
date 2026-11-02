import { AssistantRuntimeProvider, ComposerPrimitive, MessagePrimitive, ThreadPrimitive } from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
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

export function Chat({ threadId }: { threadId: string }) {
  const agent = useMemo(() => new HttpAgent({ url: `${API_URL}/agui`, threadId }), [threadId]);
  const runtime = useAgUiRuntime({ agent });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="thread">
        <ThreadPrimitive.Viewport className="viewport">
          <ThreadPrimitive.Empty>
            <p className="hint">Ask something — try “What's the weather in Sydney and what is 12 * (3 + 4)?”</p>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        </ThreadPrimitive.Viewport>
        <ComposerPrimitive.Root className="composer">
          <ComposerPrimitive.Input className="composer-input" placeholder="Send a message…" autoFocus />
          <ComposerPrimitive.Send className="btn">Send</ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

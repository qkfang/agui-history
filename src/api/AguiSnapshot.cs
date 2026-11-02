using System.Text.Json;
using Microsoft.Extensions.AI;

namespace Api;

/// <summary>Converts a stored conversation into an AG-UI MESSAGES_SNAPSHOT event so a thread can be restored by any AG-UI client.</summary>
public static class AguiSnapshot
{
    private static readonly JsonSerializerOptions Compact = new(HistoryStore.JsonOptions) { WriteIndented = false };

    private static string ResultText(object? result) => result switch
    {
        string s => s,
        JsonElement { ValueKind: JsonValueKind.String } e => e.GetString() ?? "",
        _ => JsonSerializer.Serialize(result, Compact),
    };

    public static object From(ConversationRecord record)
    {
        var messages = new List<object>();
        for (var i = 0; i < record.Messages.Count; i++)
        {
            var m = record.Messages[i];
            var id = string.IsNullOrEmpty(m.MessageId) ? $"{record.Id}-{i}" : m.MessageId;

            if (m.Role == ChatRole.User)
            {
                messages.Add(new { id, role = "user", content = m.Text });
            }
            else if (m.Role == ChatRole.Assistant)
            {
                var toolCalls = m.Contents.OfType<FunctionCallContent>()
                    .Select(c => new
                    {
                        id = c.CallId,
                        type = "function",
                        function = new
                        {
                            name = c.Name,
                            arguments = JsonSerializer.Serialize(c.Arguments ?? new Dictionary<string, object?>(), Compact),
                        },
                    })
                    .ToList();
                if (toolCalls.Count > 0)
                    messages.Add(new { id, role = "assistant", content = m.Text, toolCalls });
                else
                    messages.Add(new { id, role = "assistant", content = m.Text });
            }
            else if (m.Role == ChatRole.Tool)
            {
                var n = 0;
                foreach (var r in m.Contents.OfType<FunctionResultContent>())
                {
                    var content = ResultText(r.Result);
                    messages.Add(new { id = n++ == 0 ? id : $"{id}-{n}", role = "tool", toolCallId = r.CallId, content });
                }
            }
        }

        return new { type = "MESSAGES_SNAPSHOT", threadId = record.Id, messages };
    }
}

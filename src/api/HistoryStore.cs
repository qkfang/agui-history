using System.Text.Json;
using Microsoft.Extensions.AI;

namespace Api;

public sealed record ConversationSummary(string Id, string Title, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt, int MessageCount);

public sealed class ConversationRecord
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<ChatMessage> Messages { get; set; } = [];
}

/// <summary>Stores one JSON file per conversation under the configured directory.</summary>
public sealed class HistoryStore
{
    private static readonly JsonSerializerOptions Json = new(AIJsonUtilities.DefaultOptions) { WriteIndented = true };
    private readonly string _dir;
    private readonly object _lock = new();

    public HistoryStore(string directory)
    {
        _dir = Path.GetFullPath(directory);
        Directory.CreateDirectory(_dir);
    }

    private string PathFor(string id)
    {
        var safe = new string(id.Select(c => char.IsLetterOrDigit(c) || c is '-' or '_' ? c : '_').ToArray());
        return Path.Combine(_dir, safe + ".json");
    }

    public void Save(string id, IReadOnlyList<ChatMessage> messages)
    {
        lock (_lock)
        {
            var path = PathFor(id);
            var now = DateTimeOffset.UtcNow;
            var created = File.Exists(path) ? Load(id)?.CreatedAt ?? now : now;
            var firstUser = messages.FirstOrDefault(m => m.Role == ChatRole.User)?.Text ?? "Conversation";
            var record = new ConversationRecord
            {
                Id = id,
                Title = firstUser.Length > 60 ? firstUser[..60] + "…" : firstUser,
                CreatedAt = created,
                UpdatedAt = now,
                Messages = messages.ToList(),
            };
            File.WriteAllText(path, JsonSerializer.Serialize(record, Json));
        }
    }

    public ConversationRecord? Load(string id)
    {
        var path = PathFor(id);
        return File.Exists(path) ? JsonSerializer.Deserialize<ConversationRecord>(File.ReadAllText(path), Json) : null;
    }

    public IEnumerable<ConversationSummary> List() =>
        Directory.EnumerateFiles(_dir, "*.json")
            .Select(f => { try { return JsonSerializer.Deserialize<ConversationRecord>(File.ReadAllText(f), Json); } catch { return null; } })
            .OfType<ConversationRecord>()
            .OrderByDescending(r => r.UpdatedAt)
            .Select(r => new ConversationSummary(r.Id, r.Title, r.CreatedAt, r.UpdatedAt, r.Messages.Count));

    public static JsonSerializerOptions JsonOptions => Json;
}

using System.ComponentModel;
using System.Text.Json;
using Api;
using Azure.AI.Projects;
using Azure.Identity;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;
using Microsoft.Extensions.AI;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpContextAccessor();
builder.Services.AddAGUIServer();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.TypeInfoResolverChain.Insert(0, AIJsonUtilities.DefaultOptions.TypeInfoResolver!));

var endpoint = builder.Configuration["Foundry:ProjectEndpoint"]
    ?? throw new InvalidOperationException("Set Foundry:ProjectEndpoint (e.g. https://<account>.services.ai.azure.com/api/projects/<project>).");
var model = builder.Configuration["Foundry:Model"] ?? "gpt-4o";
var historyDir = builder.Configuration["History:Directory"] ?? Path.Combine(builder.Environment.ContentRootPath, "data", "history");

var store = new HistoryStore(historyDir);
builder.Services.AddSingleton(store);

var app = builder.Build();
app.UseCors();

// Capture the AG-UI threadId so the agent middleware can key history by conversation.
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Method == "POST" && ctx.Request.Path.StartsWithSegments("/agui"))
    {
        ctx.Request.EnableBuffering();
        try
        {
            using var doc = await JsonDocument.ParseAsync(ctx.Request.Body);
            if (doc.RootElement.TryGetProperty("threadId", out var t) && t.GetString() is { } id)
                ctx.Items["threadId"] = id;
        }
        catch (JsonException) { }
        ctx.Request.Body.Position = 0;
    }
    await next();
});

[Description("Get the current weather for a city.")]
static string GetWeather([Description("City name")] string city)
{
    var conditions = new[] { "sunny", "cloudy", "rainy", "windy", "stormy" };
    var rng = new Random(city.GetHashCode());
    return $"{city}: {conditions[rng.Next(conditions.Length)]}, {rng.Next(5, 35)}°C";
}

[Description("Get the current UTC date and time.")]
static string GetTime() => DateTimeOffset.UtcNow.ToString("u");

[Description("Evaluate a basic arithmetic expression such as '12 * (3 + 4)'.")]
static string Calculate([Description("Arithmetic expression")] string expression)
{
    var result = new System.Data.DataTable().Compute(expression, null);
    return Convert.ToString(result, System.Globalization.CultureInfo.InvariantCulture) ?? "";
}

var projectClient = new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential());
AIAgent inner = projectClient.AsAIAgent(
    model: model,
    instructions: "You are a helpful assistant. Use the available tools when they help answer the user.",
    name: "agui-assistant",
    tools: [AIFunctionFactory.Create(GetWeather), AIFunctionFactory.Create(GetTime), AIFunctionFactory.Create(Calculate)]);

var accessor = app.Services.GetRequiredService<IHttpContextAccessor>();
AIAgent agent = inner.AsBuilder()
    .Use(runFunc: null, runStreamingFunc: RecordAsync)
    .Build();

async IAsyncEnumerable<AgentResponseUpdate> RecordAsync(
    IEnumerable<ChatMessage> messages, AgentSession? session, AgentRunOptions? options, AIAgent next,
    [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
{
    var input = messages.ToList();
    var updates = new List<AgentResponseUpdate>();
    var threadId = accessor.HttpContext?.Items["threadId"] as string ?? Guid.NewGuid().ToString("N");
    try
    {
        await using var e__ = next.RunStreamingAsync(input, session, options, ct).GetAsyncEnumerator(ct);
        while (true)
        {
            try { if (!await e__.MoveNextAsync()) break; }
            catch (Exception ex) { Console.Error.WriteLine("DIAG: " + ex); throw; }
            updates.Add(e__.Current);
            yield return e__.Current;
        }
    }
    finally
    {
        // Persist the full conversation (input + generated messages), even if the client disconnects.
        var all = input.Where(m => m.Role != ChatRole.System).ToList();
        all.AddRange(updates.ToAgentResponse().Messages);
        store.Save(threadId, all);
    }
}

app.MapAGUIServer("/agui", agent);

app.MapGet("/api/history", () => store.List());
app.MapGet("/api/history/{id}", (string id) =>
    store.Load(id) is { } r ? Results.Json(r, HistoryStore.JsonOptions) : Results.NotFound());

app.Run();



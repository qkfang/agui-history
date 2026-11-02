# agui-history

Chat bot built with **Microsoft Agent Framework (.NET)**, **AG-UI** and **assistant-ui**, using a **Microsoft Foundry** model as the LLM. Tool calls render as agent cards, and every conversation is saved server-side so it can be replayed from the **History / Replay** tab.

- `src/api` – ASP.NET Core server. `MapAGUIServer("/agui", agent)` exposes the MAF agent over AG-UI; a middleware on the agent persists each conversation as JSON in `src/api/data/history/<threadId>.json`. `GET /api/history` and `GET /api/history/{id}` serve it back.
- `src/app` – Vite + React UI (assistant-ui + `@assistant-ui/react-ag-ui`).
- `bicep` – Foundry account, project and model deployment, plus a Linux App Service plan hosting the API (.NET 10) and the app (Node, static SPA) (`agui-` prefix).

## Options

The UI has three tabs, each showing a different way to work with conversation history.

| Tab | What it does | Backed by |
| --- | --- | --- |
| **Chat** | Live chat over AG-UI. Each chat has a `threadId`; **New chat** starts a fresh thread. The client sends the full message list with every request, and the server records the conversation. | `POST /agui` |
| **Thread history** | Lists saved threads and restores one as an AG-UI `MESSAGES_SNAPSHOT`, rendered read-only with the live chat component. **Continue this chat** reopens it in the Chat tab on the same `threadId`. | `GET /api/history`, `GET /api/threads/{id}/snapshot` |
| **History / Replay** | Lists saved conversations and replays them step by step (▶ Replay, Pause/Resume, Step, Show all), including tool-call cards. | `GET /api/history`, `GET /api/history/{id}` |

### Thread history
Pick a saved thread on the left to restore it. Tool calls render as cards with their arguments and result.

![Thread history](<docs/Screenshot 2026-11-02 135152.png>)

### Chat and the AG-UI event stream
A run streams AG-UI events (`RUN_STARTED`, `TEXT_MESSAGE_START/CONTENT/END`, `RUN_FINISHED`, …) over SSE.

![AG-UI event stream](<docs/Screenshot 2026-11-02 135259.png>)

### Request payload and saved history
Each request carries the `threadId` and the whole `messages` array. The server saves the conversation to `src/api/data/history/<threadId>.json`, which is what the history tabs read.

![Request payload and saved JSON](<docs/Screenshot 2026-11-02 135348.png>)

### Configuration
| Setting | Default | Description |
| --- | --- | --- |
| `Foundry:ProjectEndpoint` | – (required) | Foundry project endpoint. |
| `Foundry:Model` | `gpt-4o` | Model deployment name. |
| `History:Directory` | `data/history` | Where conversation JSON files are stored. |
| `VITE_API_URL` (app) | `http://localhost:5134` | API base URL used by the UI. |

The agent exposes three demo tools: `GetWeather`, `GetTime` and `Calculate`.

## Deploy Foundry
```
az group create -n agui-rg -l eastus2
az deployment group create -g agui-rg -f bicep/main.bicep -p principalId=$(az ad signed-in-user show --query id -o tsv)
```
Use the `projectEndpoint` and `modelDeployment` outputs below.

## Run
```
cd src/api
dotnet run --Foundry:ProjectEndpoint=<projectEndpoint> --Foundry:Model=<modelDeployment>   # http://localhost:5134 (auth: az login)

cd src/app
npm install
npm run dev        # set VITE_API_URL if the API is not on http://localhost:5134
```

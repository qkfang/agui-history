# agui-history

Chat bot built with **Microsoft Agent Framework (.NET)**, **AG-UI** and **assistant-ui**, using a **Microsoft Foundry** model as the LLM. Tool calls render as agent cards, and every conversation is saved server-side so it can be replayed from the **History / Replay** tab.

- `src/api` – ASP.NET Core server. `MapAGUIServer("/agui", agent)` exposes the MAF agent over AG-UI; a middleware on the agent persists each conversation as JSON in `src/api/data/history/<threadId>.json`. `GET /api/history` and `GET /api/history/{id}` serve it back.
- `src/app` – Vite + React UI (assistant-ui + `@assistant-ui/react-ag-ui`).
- `bicep` – Foundry account, project and model deployment, plus a Linux App Service plan hosting the API (.NET 10) and the app (Node, static SPA) (`agui-` prefix).

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

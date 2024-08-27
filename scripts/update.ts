import { open_workspace, update_workspace_collections } from "./workspace.js"

const ws = await open_workspace("./src")
await update_workspace_collections(ws)

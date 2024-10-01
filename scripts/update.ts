import { open_workspace, update_workspace_collections } from "./workspace.js"
import Path from "node:path"

const ws = await open_workspace("./src")
const outputDir = Path.resolve("../extension/dist")
await update_workspace_collections(ws, outputDir)

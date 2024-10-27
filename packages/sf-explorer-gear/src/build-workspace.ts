import Path from 'node:path'
import * as esbuild from 'esbuild'
import { emit_library_assets, Workspace } from "./workspace.js"
import express from 'express'
import { StorageFiles } from "./storage.js"
import { create_esbuild_context } from "./esbuild-plugins.js"

export enum BuildMode {
   Production = "production",
   Development = "development",
}

export async function build_workspace(
   ws: Workspace,
   storage: StorageFiles,
   mode: BuildMode,
   dist: string,
   port?: number
): Promise<void> {

   // Prepare overall library
   const lib = ws.merge_libraries(ws.libraries, "workspace")

   // Parse options
   const use_dev = mode === BuildMode.Development
   if (use_dev) console.log("Use devmode.")
   const use_serve = port ? true : false

   // Prepare storage
   storage.begin(use_dev === false || use_serve === false)

   // Generate hotreload assets
   const html_injects: string[] = []
   if (use_serve) {
      html_injects.push(`<script type="module" src="./esbuild-hotreload.js"></script>`)
      storage.commitFile(`esbuild-hotreload.js`,
         `new EventSource('http://localhost:${port}/esbuild').addEventListener('change', e => { location.reload() })`
      )
   }

   // Emit basic assets
   await emit_library_assets(lib, storage, html_injects)

   // Build javascripts assets
   const context = await create_esbuild_context(lib, storage, Path.resolve(dist), use_dev)
   if (use_serve) {
      await serve(port as number, context, storage)
   }
   else {
      await context.rebuild()
   }
   storage.end()
   await context.dispose()
}

async function serve(port: number, context: esbuild.BuildContext, storage: StorageFiles) {
   const app = express()
   await context.watch()
   app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*")
      res.setHeader('Access-Control-Allow-Methods', '*')
      res.setHeader("Access-Control-Allow-Headers", "*")
      next()
   });
   app.get('/esbuild', storage.on_changes.route())
   app.get('*', storage.route())
   app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`)
   })
   return new Promise((resolve) => {
      process.on('SIGQUIT', () => resolve(null))
   })
}

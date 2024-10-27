import { emit_library_assets, Library, Workspace } from "./workspace.js"
import { StorageFiles } from "./storage.js"
import { create_esbuild_context } from "./esbuild-plugins.js"
import DtsGenerator from "./dts-generator.js"
import Fs from "fs"
import ChildProcess from "child_process"

type BuildLibraryOptions = {
   outputDir: string
   deliverDir?: string
   version?: string
}

export async function build_library(ws: Workspace, lib: Library, opts: BuildLibraryOptions) {
   const { outputDir } = opts
   console.log(`> Build library: ${lib.name} -> ${outputDir}`)

   // Prepare storage
   const storage = new StorageFiles(outputDir)
   storage.begin(true)

   // Emit package.json
   let package_json = { ...lib.delivered }
   package_json.version = opts.version || package_json.version
   storage.commitFile("package.json", JSON.stringify(package_json, null, 2))

   // Emit basic  assets
   await emit_library_assets(lib, storage, [])

   // Emit types assets
   try {
      const configText = Fs.readFileSync("./tsconfig.json").toString()
      await DtsGenerator({
         prefix: lib.name,
         baseDir: lib.path,
         outDtsFile: storage.baseDir + "/types.d.ts",
         outDir: storage.baseDir,
         exclude: ["node_modules/**/*"],
         compilerOptions: configText,
      })
   }
   finally {
   }

   // Build javascripts assets
   const context = await create_esbuild_context(lib, storage, outputDir, true, [
      {
         name: "externals",
         setup(build) {
            build.onResolve({ filter: /.*/ }, ({ path }) => {
               if (!path.startsWith(lib.name)) {
                  if (!path.startsWith(".") || path.startsWith("react")) {
                     console.log("exclude", path)
                     return { external: true }
                  }
               }
            })
         }
      },
   ])
   await context.rebuild()
   storage.end()
   context.dispose()

   if (opts.deliverDir) {
      ChildProcess.execSync("npm pack --pack-destination " + opts.deliverDir, { cwd: opts.outputDir })
   }
}

export function make_libname(pattern: string) {
   return pattern.split(/[^a-zA-Z0-9]/).filter(x => x.length > 0).join("-")
}


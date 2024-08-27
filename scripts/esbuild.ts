import Fs from "node:fs"
import Path from 'node:path'
import Crypto from 'node:crypto'
import Process from "node:process"
import Yargs from "yargs"
import * as esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'
import { open_workspace, update_workspace_collections } from "./workspace.js"
import postcss from 'postcss'
import copyAssets from 'postcss-copy-assets'
import express from 'express'
import { StorageFiles } from "./helpers.js"
import { hideBin } from 'yargs/helpers'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import { file, directory } from "@polycuber/script.cli"

function command_build() {
   return {
      command: 'build',
      describe: 'Build web application',
      builder: (yargs) => yargs
         .option("env", {
            type: "string",
            default: "development",
         })
         .option("features", {
            type: "string",
            default: "",
         }),
      handler: async (argv) => {
         const storage = new StorageFiles('./dist')
         console.time("build")
         await build(argv, storage)
         console.timeEnd("build")
      }
   }
}

function command_serve() {
   return {
      command: 'serve',
      describe: 'Server web application with continues build',
      builder: (yargs) => yargs
         .option("env", {
            type: "string",
            default: "development",
         })
         .option("features", {
            type: "string",
            default: "",
         })
         .option("port", {
            type: "number",
            default: 3000,
         }),
      handler: async (argv) => {
         const storage = new StorageFiles('./dist')
         console.time("build")
         const context = await build(argv, storage)
         console.timeEnd("build")
         await serve(argv.port, context, storage)
      }
   }
}

function command_fail() {
   return {
      command: '*',
      handler: async (argv) => {
         throw "Error: Invalid command"
      }
   }
}

Yargs(hideBin(Process.argv)).scriptName("pcl")
   .command(command_build())
   .command(command_serve())
   .command(command_fail())
   .showHelpOnFail(true)
   .help()
   .parse()

async function build(env: {
   mode: string
   features: string
}, storage: StorageFiles): Promise<esbuild.BuildContext> {
   
   // Parse options
   const use_dev = env.mode === "development"
   if (use_dev) console.log("Use devmode.")
   const use_features = env.features?.split(",")
   if (use_features) console.log("Use features: ", use_features)

   // Clean dist
   directory.clean("./dist")

   // Open workspace
   const ws = await open_workspace("./src", use_features)
   await update_workspace_collections(ws)

   // Register pages and entry from workspace
   const entry = {}
   const importmap = { imports: {}, scopes: {} }
   for (const app of ws.applications) {
      entry[app.name] = app.entry
   }
   for (const name in ws.entries) {
      const extname = make_filename(name)
      entry[extname] = ws.entries[name]
      importmap.imports[name] = `./${extname}.js`
   }

   // Generate assets
   file.copy.toDir("./src/favicon.webp", "./dist")
   directory.copy("./node_modules/@salesforce-ux/design-system/assets", "./dist/assets")
   for (const app of ws.applications) {
      write_html_content(app.name, `./${app.name}.js`, importmap, true)
   }

   // Define polyfill modules
   const polyfill_modules = {
      "buffer": Path.resolve("scripts/browser-modules/buffer.js"),
      "process": Path.resolve("scripts/browser-modules/process.js"),
   }

   // Generate javascript
   const options: esbuild.BuildOptions = {
      entryPoints: entry,
      outdir: storage.baseDir,
      format: 'esm',
      target: 'es2020',
      platform: "browser",
      sourcemap: use_dev ? "linked" : false,
      minify: use_dev ? false : true,
      bundle: true,
      splitting: true,
      treeShaking: true,
      write: false,
      jsx: "automatic",
      jsxImportSource: "react",
      mainFields: ['module', 'main'],
      define: {
         "process.browser": "true",
         ...Object.keys(ws.constants).reduce((prev, key) => {
            const name = `constants.${key}`
            prev[name] = JSON.stringify(ws.constants[key])
            console.log(`+ ${name} = ${prev[name]}`)
            return prev
         }, {})
      },
      plugins: [
         {
            name: 'esm-resolver',
            setup(build) {
               const filter = /.*/
               build.onResolve({ filter }, async (args) => {
                  try {
                     if (args.path.includes("@mui/icons-material/") && args.with['esm-resolver'] !== "true") {
                        const esm_alt = args.path.replace("@mui/icons-material/", "@mui/icons-material/esm/")
                        const result = await build.resolve(esm_alt, {
                           kind: args.kind,
                           resolveDir: args.resolveDir,
                           importer: args.importer,
                           namespace: args.namespace,
                           with: { 'esm-resolver': "true" },
                        })
                        return result
                     }
                     else if (polyfill_modules[args.path]) {
                        return {
                           path: polyfill_modules[args.path],
                           namespace: "file",
                        }
                     }
                  } catch (e) {
                  }
               })
            },
         },
         NodeModulesPolyfillPlugin(),
         sassPlugin({
            type: 'style',
            async transform(source: string, resolveDir: string, filePath: string) {
               const { css } = await postcss()
                  .use(copyAssets({
                     base: storage.baseDir,
                  }) as any)
                  .process(source, {
                     from: filePath,
                     to: `${storage.baseDir}/index.css`
                  })
               return css
            }
         }),
         storage.plugin(),
      ],
      loader: {
         '.jpg': 'file',
         '.jpeg': 'file',
         '.png': 'file',
         '.gif': 'file',
         '.eot': 'file',
         '.ttf': 'file',
         '.svg': 'file',
         '.woff': 'file',
         '.woff2': 'file',
         '.md': 'file',
      },
   }

   return esbuild.context(options)
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
}

function make_filename(pattern: string) {
   return pattern.split(/[^a-zA-Z0-9]/).filter(x => x.length > 0).join("_")
}

function write_html_content(name: string, entry: string, importmap: any, hotreload: boolean) {
   Fs.writeFileSync(`./dist/${name}.html`, `<!DOCTYPE html>
<html>
    <head>
        <title>${name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" type="image/webp" href="favicon.webp">
        <script type="module" src="${entry}"></script>
        ${hotreload && `<script>
            new EventSource('/esbuild').addEventListener('change', e => {
                location.reload()
            })
        </script>`}
    </head>
    <body>
    </body>
</html>`)
}

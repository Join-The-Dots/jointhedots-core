import Fs from "node:fs"
import Path from 'node:path'
import Crypto from 'node:crypto'
import * as esbuild from 'esbuild'
import { sassPlugin } from 'esbuild-sass-plugin'
import { ApplicationEntry, emit_workspace_assets, IStorageStream, open_workspace } from "./workspace.js"
import postcss from 'postcss'
import express from 'express'
import { StorageFiles } from "./helpers.js"
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'
import MIME from 'mime'
import Url from "node:url"


export function command_build() {
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
         })
         .option("dist", {
            type: "string",
            default: "./dist",
         }),
      handler: async (argv) => {
         const outputDir = Path.resolve(argv.dist)
         const storage = new StorageFiles(outputDir)
         console.time("build")
         await build(argv, storage)
         console.timeEnd("build")
      }
   }
}

export function command_serve() {
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
         })
         .option("dist", {
            type: "string",
            default: "./dist",
         }),
      handler: async (argv) => {
         const storage = new StorageFiles(argv.dist)
         await build(argv, storage)
      }
   }
}

export async function build(env: {
   mode?: string
   features?: string
   port?: number
   dist: string
}, storage: StorageFiles): Promise<void> {

   // Parse options
   const use_dev = env.mode === "development"
   if (use_dev) console.log("Use devmode.")
   const use_features = env.features?.split(",")
   if (use_features) console.log("Use features: ", use_features)
   const use_serve = env.port ? true : false

   // Clean storage
   if (use_dev === false || use_serve === false) {
      storage.clean()
   }

   // Open workspace
   const ws = await open_workspace(".", use_features)
   await emit_workspace_assets(ws, storage)

   // Generate html assets
   if (use_serve) {
      storage.commit(`esbuild-hotreload.js`,
         `new EventSource('http://localhost:${env.port}/esbuild').addEventListener('change', e => { location.reload() })`
      )
   }
   for (const app of ws.applications) {
      write_html_content(app, storage, use_serve)
   }

   // Define polyfill modules
   const polyfill_modules = {
      "buffer": Path.resolve("scripts/browser-modules/buffer.js"),
      "process": Path.resolve("scripts/browser-modules/process.js"),
   }

   // Generate javascript
   const options: esbuild.BuildOptions = {
      entryPoints: ws.entries,
      outdir: Path.resolve(env.dist),
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
      mainFields: ['browser', 'module', 'main', 'index'],
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
            async transform(source: string, _resolveDir: string, filePath: string) {
               const { css } = await postcss()
                  .use(copyAssets(storage))
                  .process(source, {
                     from: filePath,
                     to: `index.css`
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

   const context = await esbuild.context(options)
   if (use_serve) {
      await serve(env.port as number, context, storage)
   }
   else {
      await context.rebuild()
   }
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

function write_html_content(app: ApplicationEntry, storage: IStorageStream, hotreload: boolean) {
   storage.commit(`${app.name}.html`, `<!DOCTYPE html>
<html>
    <head>
        <title>${app.name}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${app.favicon ? `<link rel="icon" type="${MIME.getType(app.favicon)}" href="${app.favicon}">` : ""}
        <script type="module" src="./${app.name}.js"></script>
        ${hotreload ? `<script type="module" src="./esbuild-hotreload.js"></script>` : ""}
    </head>
    <body>
    </body>
</html>`)
}

function copyAssets(storage: IStorageStream) {

   function trimUrlValue(value) {
      var beginSlice, endSlice;
      value = value.trim();
      beginSlice = value.charAt(0) === '\'' || value.charAt(0) === '"' ? 1 : 0;
      endSlice = value.charAt(value.length - 1) === '\'' ||
         value.charAt(value.length - 1) === '"' ?
         -1 : undefined;
      return value.slice(beginSlice, endSlice).trim();
   }

   function getCommonBaseDir(a, b) {
      var common = [];
      a = a.split(Path.sep);
      b = b.split(Path.sep);
      for (var i = 0; i < a.length; i++) {
         if (b[i] === undefined || b[i] !== a[i]) {
            break;
         }
         common.push(a[i]);
      }
      return common.join(Path.sep);
   }

   function handleUrlDecl(decl: any, result: any) {
      decl.value = decl.value.replace(/url\((.*?)\)/g,
         function (fullMatch, urlMatch) {

            urlMatch = trimUrlValue(urlMatch);

            // Ignore absolute urls, data URIs, or hashes
            if (urlMatch.indexOf('/') === 0 ||
               urlMatch.indexOf('data:') === 0 ||
               urlMatch.indexOf('#') === 0 ||
               /^[a-z]+:\/\//.test(urlMatch)) {
               return fullMatch;
            }

            // '/path/to/project/src/css/page/'
            var cssFromDirAbs = Path.dirname(Path.resolve(result.opts.from));
            // parsed.pathname = '../../images/foo.png'
            var assetUrlParsed = Url.parse(urlMatch);
            // '/path/to/project/src/images/foo.png'
            var assetFromAbs = Path.resolve(cssFromDirAbs, assetUrlParsed.pathname);
            // 'foo.png'
            var assetBasename = Path.basename(assetUrlParsed.pathname);
            // '/path/to/project/src/images'
            var assetFromDirAbs = Path.dirname(assetFromAbs);
            // '/path/to/project/src'
            var fromBaseDirAbs = getCommonBaseDir(assetFromDirAbs, cssFromDirAbs);
            // 'images'
            var assetPathPart = Path.relative(fromBaseDirAbs, assetFromDirAbs);
            // '/path/to/project/dist/assets/images/foo.png'
            var newAssetFile = Path.join(assetPathPart, assetBasename);

            // Read the original file
            var contents = null;
            try {
               contents = Fs.readFileSync(assetFromAbs);
            } catch (e) {
               result.warn('Can\'t read asset file "' +
                  assetFromAbs + '". Ignoring.', { node: decl });
               contents = null;
            }

            // 'foo.png?a=123'
            var urlBasename = assetBasename +
               (assetUrlParsed.search ? assetUrlParsed.search : '') +
               (assetUrlParsed.hash ? assetUrlParsed.hash : '');
            // '../../images/foo.png?a=123'
            var newUrl = 'url("' + Path.join(assetPathPart, urlBasename) + '")';

            // Make url() path separator posix
            if (Path.sep === Path.win32.sep) {
               newUrl = newUrl.replace(/\\/g, '/');
            }

            // Return early with new url() string if original file is unreadable
            if (contents === null) {
               return newUrl;
            }

            // Write new asset file into base dir
            try {
               storage.commit(newAssetFile, contents)
            } catch (e) {
               result.warn('Can\'t write new asset file "' +
                  newAssetFile + '". Ignoring.', { node: decl });
               return newUrl;
            }

            return newUrl;
         }
      );
   }

   return function (css, result) {
      css.walkDecls(function (decl) {
         if (decl.value && decl.value.indexOf('url(') > -1) {
            handleUrlDecl(decl, result);
         }
      });
   };
}

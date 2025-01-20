import Fs from "node:fs"
import Fsp from "node:fs/promises"
import Process from "node:process"
import Path from "node:path"
import Crypto from "node:crypto"
import MIME from 'mime'
import { copyToStorageStream, readJsonFile } from "./storage.js"
import { checkComponentManifest, ComponentID, ComponentManifest, ComponentPublication, makeComponentPublication, ResourceEntry } from "./component.js"

const debug_trace = false

export interface IStorageStream {
   begin(cleanup: boolean)
   commitContent(contentData: Uint8Array | string, contentType?: string): string
   commitFile(key: string, contentData: Uint8Array | string, contentType?: string)
   end()
}

export type FeatureID = string // Identifier of feature
export type CatalogID = string // Identifier of catalog
export type ModuleID = string // Location of esm file: ./{module_path}
export type ExportID = ModuleID // Location of esm export: ./{module_path}#{export_name}

export type MapLike<T> = { [key: string]: T }

export type CatalogEntry = {
   module: ExportID
   [meta: string]: any
}

export type CatalogCollection = {
   module: ExportID
   catalog: CatalogID
   typing?: ExportID
   lazy?: boolean
}

export type ApplicationEntry = {
   title: string
   name: string
   entry: ModuleID
   favicon: string
}

export type AssetsEntry = string | {
   from: string
   to: string
}

export type DeclarationDescriptor = {
   application?: ApplicationEntry
   features?: FeatureID[]
   publish?: {
      [catalog: CatalogID]: CatalogEntry[]
   }
   collections?: {
      [filename: string]: CatalogCollection
   }
   assets?: AssetsEntry[]
}

export interface PackageDescriptor {
   name: string
   version: string
   module?: string
   main?: string
   types?: string
   componentsContainer?: boolean
   exports?: {
      [path: string]: string | {
         import?: string
         require?: string
         default?: string
         types?: string
      }
   }
   dependencies?: {
      [packageName: string]: string
   }
   devDependencies?: {
      [packageName: string]: string
   }
   peerDependencies?: {
      [packageName: string]: string
   }
   optionalDependencies?: {
      [packageName: string]: string
   }
   bundledDependencies?: string[]
   bin?: {
      [commandName: string]: string
   }
   scripts?: {
      [scriptName: string]: string
   }
   description?: string
   [metadata: string]: any
}

export class Library {
   delivered: PackageDescriptor = null
   declarations = new Map<string, DeclarationDescriptor>()
   components = new Map<ComponentID, ComponentManifest>()
   applications: ApplicationEntry[] = []
   entries: { [url: string]: string } = {}
   manifests: { [url: string]: any } = {}
   assets: AssetsEntry[] = []
   externals: MapLike<string> = {}
   search_directories: string[] = null
   constructor(
      readonly name: string,
      readonly path: string,
      readonly descriptor: PackageDescriptor,
      readonly workspace: Workspace,
   ) {
      this.search_directories = workspace.search_directories.slice()
      Object.assign(this.externals, descriptor.peerDependencies, descriptor.dependencies)
   }
   is_enabled_for(features?: FeatureID[]) {
      return this.workspace.is_enabled_for(features)
   }
}

export class Workspace {
   libraries: Library[] = []
   constants: { [key: string]: string | number } = {}
   features: FeatureID[] = []
   search_directories: string[] = []
   constructor(
      readonly name: string,
      readonly version: string,
      readonly path: string,
      features?: string,
   ) {
      this.features = features?.split(",") || []
   }
   is_enabled_for(features?: FeatureID[]) {
      if (this.features.length > 0 && features) {
         return features.reduce((val, ft) => this.features.includes(ft) || val, false)
      }
      return true
   }
   merge_libraries(libraries: Library[], name?: string): Library {
      const mlib_desc: PackageDescriptor = {
         name: name || this.name,
         version: this.version,
      }
      const mlib = new Library(name, this.path, mlib_desc, this)
      function merge_map_into<K, V>(dest: Map<K, V>, src: Map<K, V>) {
         for (const [k, v] of src) {
            dest.set(k, v)
         }
      }
      for (const lib of libraries) {
         merge_map_into(mlib.declarations, lib.declarations)
         merge_map_into(mlib.components, lib.components)
         mlib.applications.push(...lib.applications)
         Object.assign(mlib.entries, lib.entries)
         Object.assign(mlib.manifests, lib.manifests)
         mlib.assets.push(...lib.assets)
         Object.assign(mlib.externals, lib.externals)
      }
      return mlib
   }
}


const exclude_dirs = ["node_modules"]

async function discover_library_components(lib: Library, path: string) {
   const comp_dir_name = "component.json"
   const comp_file_ext = ".component.json"

   for (const fname of await Fsp.readdir(path)) {
      const fpath = `${path}/${fname}`
      const fstat = await Fsp.stat(fpath)
      if (fstat.isDirectory()) {
         if (!exclude_dirs.includes(fname)) {
            await discover_library_components(lib, fpath)
         }
      }
      else if (fstat.isFile()) {
         const is_component = fname === comp_dir_name || fname.endsWith(comp_file_ext)
         if (fname === "declaration.json" || fname === "publication.json" || is_component) {
            try {
               const data = await Fsp.readFile(fpath)
               const desc = JSON.parse(data.toString()) as (ComponentManifest & DeclarationDescriptor)
               if (lib.is_enabled_for(desc.features)) {
                  if (is_component) {
                     const err = checkComponentManifest(desc, fpath)
                     if (err) throw err
                     lib.components.set(fpath, desc as ComponentManifest)
                     console.log("+ component:", fpath)
                  }
                  else {
                     lib.declarations.set(fpath, desc as ComponentManifest)
                     console.log("+ declaration:", fpath)
                  }
               }
            }
            catch (e) {
               console.log(`! invalid descriptor at ${fpath}: ${e?.message}`)
            }
         }
      }
   }
}

function resolve_canonical_path(targetPath: string): string {
   targetPath = Path.resolve(targetPath)
   try {
      const stats = Fs.lstatSync(targetPath)
      if (stats.isSymbolicLink()) {
         return Path.resolve(Fs.readlinkSync(targetPath))
      }
   }
   catch (err) { }
   return targetPath
}

async function discover_library(ws: Workspace, location: string) {
   const lib_path = resolve_canonical_path(location)
   const lib_not_exists = ws.libraries.reduce((r, lib) => r && lib.path !== lib_path, true)
   if (lib_not_exists) {
      const lib_desc = await readJsonFile(Path.join(lib_path, "/package.json"))
      if (lib_desc?.componentsContainer) {
         const lib = new Library(lib_desc.name, lib_path, lib_desc, ws)
         ws.libraries.push(lib)

         const lib_search_path = lib_path + "/node_modules"
         if (Fs.existsSync(lib_search_path)) {
            lib.search_directories.push(lib_search_path)
         }

         await discover_library_components(lib, Path.resolve(lib_path))
      }

   }
}

function resolve_entry_path(lib: Library, entryId: string, baseDir: string): string {
   if (entryId.startsWith(".")) {
      return make_relative_path(Process.cwd(), Path.resolve(baseDir, entryId))
   }
   else {
      const parts = entryId.split("/")
      for (const search_path of lib.search_directories) {
         if (Fs.existsSync(search_path + "/" + parts[0])) {
            return make_relative_path(Process.cwd(), search_path + "/" + entryId)
         }
      }
      return null
   }
}

function make_relative_path(baseDir: string, ...path: string[]) {
   const relpath = Path.relative(baseDir, Path.resolve(...path)).replace(/\\/g, "/")
   if (relpath.startsWith(".")) return relpath
   else return "./" + relpath
}

type CollectionGenerationEnv = {
   lib: Library
   collect: CatalogCollection
   collect_name: string
   collect_dir: string
   declaration: DeclarationDescriptor
   declaration_path: string
}

function get_data_at(path: string, data: any): any {
   try {
      for (const key of path.split("/")) {
         if (key) data = data[key]
      }
      return data
   }
   catch (e) {
      return undefined
   }
}

class GenerationOutput {
   symbols = new Set<string>()
   exportType: string = ""
   heads: string[] = []
   chunks: string[] = []
   counter = 0
   make_symbol(id: string, symbol: string): string {
      if (symbol === "default") {
         symbol = id.split("/").pop() as string
      }
      if (this.symbols.has(symbol)) {
         let counter = 0
         let suffixed = symbol + "_0"
         while (this.symbols.has(suffixed)) {
            suffixed = symbol + "_" + (++counter)
         }
         symbol = suffixed
      }
      this.symbols.add(symbol)
      return symbol
   }
   add_import(id: string, imported: string): string {
      let importer: string
      const symbol = this.make_symbol(id, imported)
      if (imported === symbol) importer = `import { ${symbol} } from "${id}"`
      else importer = `import { ${imported} as ${symbol} } from "${id}"`
      this.heads.push(importer)
      return symbol
   }
   set_export_type(id: string, symbol: string) {
      this.exportType = this.add_import(id, symbol)
   }
   generate(): string {
      return [
         this.heads.join("\n"),
         ``,
         `export default [`,
         `   ${this.chunks.join("\n   ")}`,
         this.exportType ? `] as ${this.exportType}[]` : `]`,
         ``,
      ].join("\n")
   }
}

function generate_reference(gen: GenerationOutput, ref: string, env: CollectionGenerationEnv): string {
   if (ref.startsWith(".")) {
      const mod_parts = ref.split("#")
      const mod_path = make_relative_path(env.collect_dir, Path.dirname(env.declaration_path), mod_parts[0])
      if (env.collect.lazy) {
         return `async () => (await import("${mod_path}")).${mod_parts[1] || "default"}`
      }
      else {
         return gen.add_import(mod_path, mod_parts[1] || "default")
      }
   }
   else if (ref.startsWith("component:")) {
      return JSON.stringify(get_data_at(ref.slice(4), env.declaration))
   }
   else {
      throw `Invalid $ref '${ref}' at component '${env.declaration_path}'`
   }
}

async function generate_collection(name: string, baseDir: string, collect: CatalogCollection, lib: Library) {
   const env: CollectionGenerationEnv = {
      lib,
      collect,
      collect_name: name,
      collect_dir: baseDir,
      declaration: null as any,
      declaration_path: null as any,
   }
   const gen = new GenerationOutput()
   if (collect.typing) {
      const typing = collect.typing.split("#")
      if (typing.length !== 2) {
         throw `Invalid typing '${collect.typing}' at collection '${env.declaration_path}#${name}'`
      }
      gen.set_export_type(typing[0], typing[1])
   }
   for (const [path, desc] of lib.declarations) {
      const entries = desc.publish?.[collect.catalog]
      if (entries) {
         env.declaration = desc
         env.declaration_path = path
         for (const entry of entries) {
            if (typeof entry?.$ref === "string") {
               const code = generate_reference(gen, entry?.$ref, env)
               gen.chunks.push(`${code},`)
            }
            else {
               gen.chunks.push(`{`)
               for (const key in entry) {
                  const value = entry[key]
                  let code: string = "null"
                  if (typeof value?.$ref === "string") {
                     code = generate_reference(gen, value?.$ref, env)
                  }
                  else {
                     code = JSON.stringify(value)
                  }
                  gen.chunks.push(`   ${key}: ${code},`)
               }
               gen.chunks.push(`},`)
            }
         }
      }
   }
   return gen.generate()
}

export type DeploymentManifest = {
   name: string
   baseline: string
   components: MapLike<string>
   catalogs: MapLike<string>
}

export async function emit_library_assets(lib: Library, storage: IStorageStream, html_injects: string[]) {

   // Emit static components manifest
   const manifest: DeploymentManifest = {
      name: lib.name,
      baseline: lib.workspace.version,
      components: {},
      catalogs: {},
   }
   const catalogs: MapLike<ComponentPublication[]> = { "every": [] }
   for (const id in lib.manifests) {
      const manif = lib.manifests[id]
      const pub = makeComponentPublication(manif)
      if (Array.isArray(manif.catalogs)) {
         for (const name of manif.catalogs) {
            let catalog = catalogs[name]
            if (!catalog) catalog = catalogs[name] = []
            catalog.push(pub)
         }
      }
      catalogs.every.push(pub)
      manifest.components[id] = await storage.commitContent(JSON.stringify(manif, null, 2), MIME.getType(".json"))
   }

   // Emit static components catalogs
   for (const name in catalogs) {
      const catalog = JSON.stringify(catalogs[name], null, 2)
      manifest.catalogs[name] = await storage.commitContent(catalog, MIME.getType(".json"))
   }

   await storage.commitFile(`components.manifest.json`, JSON.stringify(manifest, null, 2))

   // Emit static assets
   for (const asset of lib.assets) {
      if (typeof asset === "string") {
         copyToStorageStream(storage, asset, asset)
      }
      else {
         copyToStorageStream(storage, asset.to, asset.from)
      }
   }

   // Emit static application html
   for (const app of lib.applications) {
      emit_application_html(app, storage, html_injects)
   }
}

function emit_application_html(app: ApplicationEntry, storage: IStorageStream, html_injects: string[]) {
   storage.commitFile(`${app.name}.html`, `<!DOCTYPE html>
   <html>
       <head>
           <title>${app.name}</title>
           <meta charset="utf-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
           ${app.favicon ? `<link rel="icon" type="${MIME.getType(app.favicon)}" href="${app.favicon}">` : ""}
           <script defer type="module" src="./${app.name}.js"></script>
           ${html_injects.join('\n           ')}
       </head>
       <body>
       </body>
   </html>`)
}

async function prepare_library(lib: Library) {
   const { descriptor } = lib

   const delivered = lib.delivered = {
      ...descriptor,
      name: lib.name,
      type: "module",
      exports: undefined,
   } as PackageDescriptor

   // Prepare library package exports
   for (const exp_id in descriptor.exports) {
      const exported = descriptor.exports[exp_id]
      const entry = resolve_entry_path(lib, typeof exported === "string" ? exported : exported?.import, lib.path)
      const name = make_filename("export_" + compute_hashID(entry))
      if (!delivered.exports) {
         delivered.exports = {}
      }
      delivered.exports[exp_id] = {
         import: `./${name}.js`,
         types: "./types.d.ts",
      }
      lib.entries[name] = entry
   }

   // Prepare declarations descriptors
   for (const [path, desc] of lib.declarations) {
      const baseDir = Path.dirname(path)

      // Prepare application descriptor
      if (desc.application) {
         const { entry, favicon } = desc.application
         const app = {
            ...desc.application,
            entry: resolve_entry_path(lib, entry, baseDir),
            favicon: favicon ? resolve_entry_path(lib, favicon, baseDir) : null,
         }
         lib.entries[app.name] = app.entry
         lib.applications.push(app)
         console.log(`+ application: ${app.name} : http://localhost:3000/${app.name}.html`)
      }

      // Prepare assets descriptor
      if (desc.assets) {
         for (const entry of desc.assets) {
            if (typeof entry === "string") {
               const assets = {
                  from: resolve_entry_path(lib, entry, baseDir),
                  to: entry,
               }
               lib.assets.push(assets)
               console.log(`+ assets: ${assets.from} -> ${assets.to}`)
            }
            else {
               const assets = {
                  from: resolve_entry_path(lib, entry.from, baseDir),
                  to: entry.to,
               }
               lib.assets.push(assets)
               console.log(`+ assets: ${assets.from} -> ${assets.to}`)
            }
         }
      }
   }

   // Prepare components manifest
   const entryfiles = {}
   for (const url in lib.entries) {
      entryfiles[lib.entries[url]] = url
   }
   for (const [path, desc] of lib.components) {
      const id = desc.$id

      const manifest: Partial<ComponentManifest> = {
         ...desc,
         application: undefined,
         publish: undefined,
         collections: undefined,
         entries: undefined,
      }
      lib.manifests[id] = manifest
      console.log(`+ component: ${id}`)

      function compile_resource_map(kind: string, entries: MapLike<ResourceEntry>, baseDir: string) {
         const catalog: MapLike<ResourceEntry> = {}
         for (const name in entries) {
            const link = entries[name]
            if (typeof link === "string") {
               const parts = link.split("#")
               const file = resolve_entry_path(lib, parts[0], baseDir)
               let ref = entryfiles[name]
               if (!ref) {
                  ref = make_filename("addon_" + compute_hashID(file))
                  lib.entries[ref] = file
               }
               catalog[name] = `./${ref}.js#${parts[1] || "default"}`
               if (debug_trace) console.log(`+ ${kind}: ${id}#${name} -> ${catalog[name]}`)
            }
            else {
               catalog[name] = link
            }
         }
         return catalog
      }

      if (desc.services) {
         manifest.services = compile_resource_map("service", desc.services, Path.dirname(path))
      }

      if (desc.resources) {
         manifest.resources = compile_resource_map("resource", desc.resources, Path.dirname(path))
      }
   }

   // Patch collections files
   for (const [path, desc] of lib.declarations) {
      for (const name in desc.collections) {
         const file = `${Path.dirname(path)}/${name}.ts`
         console.log("+ update:", file)
         const code = await generate_collection(name, Path.dirname(path), desc.collections[name], lib)
         await Fsp.writeFile(file, code)
      }
   }
}

export async function open_workspace(workspace_path: string, workspace_features?: string): Promise<Workspace> {
   const package_json = await readJsonFile(workspace_path + "/package.json")
   const ws = new Workspace(package_json.name, package_json.version, workspace_path, workspace_features)
   ws.constants = package_json.constants || {}

   let package_lock: any = null
   for (let path = Path.resolve(ws.path); ;) {
      const search_path = path + "/node_modules"
      if (Fs.existsSync(search_path) && Fs.existsSync(path + "/package.json")) {
         ws.search_directories.push(search_path)
      }
      const package_lock_path = path + "/package-lock.json"
      if (!package_lock && Fs.existsSync(package_lock_path)) {
         package_lock = await readJsonFile(package_lock_path)
      }
      const next_path = Path.dirname(path)
      if (next_path === path) break
      path = next_path
   }
   if (!package_lock) {
      throw new Error(`Package lock not found for '${ws.name}'`)
   }

   for (const location in package_lock.packages) {
      await discover_library(ws, location)
   }

   for (const lib of ws.libraries) {
      await prepare_library(lib)
   }

   return ws
}

export function compute_hashID(identity: string): string {
   const hasher = Crypto.createHash("sha256")
   hasher.write(identity)
   return hasher.digest().toString("base64url")
}

export function make_filename(pattern: string) {
   return pattern.split(/[^a-zA-Z0-9]/).filter(x => x.length > 0).join("_")
}

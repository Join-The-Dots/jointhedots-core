import Fsp from "node:fs/promises"
import Process from "node:process"
import Path from "node:path"
import Crypto from "node:crypto"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url);

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
   title: string,
   name: string
   entry: ModuleID
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
   entries?: {
      [url: string]: string
   }
}

export type ComponentDescriptor = {
   id: string
   name?: string
   features?: FeatureID[]
   attachments?: {
      [name: string]: string
   }
   [metadata: string]: any
}

export interface ComponentPublication {
   component_id: string
   icon: string
   title: string
   description: string
   keywords?: string[]
   tags?: string[]
}

export class Workspace {
   declarations = new Map<string, DeclarationDescriptor>()
   components = new Map<string, ComponentDescriptor>()
   applications: ApplicationEntry[] = []
   entries: { [url: string]: string } = {}
   constants: { [key: string]: string | number } = {}
   manifests: { [url: string]: any } = {}
}

function is_enabled_for(features?: FeatureID[], enables?: FeatureID[]) {
   if (enables && features) return features.reduce((val, ft) => enables.includes(ft) || val, false)
   return true
}

async function discover_components(path: string, ws: Workspace, enables?: FeatureID[]) {
   const comp_dir_name = "component.json"
   const comp_file_ext = ".component.json"

   for (const fname of await Fsp.readdir(path)) {
      const fpath = `${path}/${fname}`
      const fstat = await Fsp.stat(fpath)
      if (fstat.isDirectory()) {
         await discover_components(fpath, ws, enables)
      }
      else {
         const is_component = fname === comp_dir_name || fname.endsWith(comp_file_ext)
         if (fname === "declaration.json" || fname === "publication.json" || is_component) {
            try {
               const data = await Fsp.readFile(fpath)
               const desc = JSON.parse(data.toString()) as (ComponentDescriptor & DeclarationDescriptor)
               if (is_enabled_for(desc.features, enables)) {
                  if (is_component) {
                     if (typeof desc.id !== "string") throw new Error("Component descriptor shall have 'id'")
                     ws.components.set(fpath, desc as ComponentDescriptor)
                     console.log("+ component:", fpath)
                  }
                  else {
                     ws.declarations.set(fpath, desc as DeclarationDescriptor)
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

function resolve_entry_path(entryId: string, baseDir: string): string {
   if (entryId.startsWith(".")) {
      return make_relative_path(Process.cwd(), Path.resolve(baseDir, entryId))
   }
   else {
      return make_relative_path(Process.cwd(), require.resolve(entryId))
   }
}

function make_relative_path(baseDir: string, ...path: string[]) {
   const relpath = Path.relative(baseDir, Path.resolve(...path)).replace(/\\/g, "/")
   if (relpath.startsWith(".")) return relpath
   else return "./" + relpath
}

type CollectionGenerationEnv = {
   ws: Workspace
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

async function generate_collection(name: string, baseDir: string, collect: CatalogCollection, ws: Workspace) {
   const env: CollectionGenerationEnv = {
      ws,
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
   for (const [path, desc] of ws.declarations) {
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

export async function update_workspace_collections(ws: Workspace, outputDir: string) {

   for (const [path, desc] of ws.declarations) {
      for (const name in desc.collections) {
         const file = `${Path.dirname(path)}/${name}.ts`
         console.log("+ update:", file)
         const code = await generate_collection(name, Path.dirname(path), desc.collections[name], ws)
         await Fsp.writeFile(file, code)
      }
   }

   const manifest_dir = Path.resolve(outputDir, "manifest")
   const catalogs_dir = Path.resolve(outputDir, "catalogs")
   await Fsp.mkdir(manifest_dir, { recursive: true })
   await Fsp.mkdir(catalogs_dir, { recursive: true })

   const catalogs: MapLike<ComponentPublication[]> = { "every": [] }
   for (const id in ws.manifests) {
      const manif = ws.manifests[id]
      const file = manifest_dir + "/" + encodeURIComponent(id) + ".json"
      const pub = {
         component_id: id,
         icon: manif.icon,
         title: manif.title || id,
         description: manif.description || "",
         keywords: manif.keywords,
         tags: manif.tags,
      }
      if (Array.isArray(manif.catalogs)) {
         for (const name of manif.catalogs) {
            let catalog = catalogs[name]
            if (!catalog) catalog = catalogs[name] = []
            catalog.push(pub)
         }
      }
      catalogs.every.push(pub)
      await Fsp.writeFile(file, JSON.stringify(manif, null, 2))
   }
   for (const name in catalogs) {
      const catalog = catalogs[name]
      await Fsp.writeFile(Path.resolve(catalogs_dir, name + ".json"), JSON.stringify(catalog, null, 2))
   }

}

export async function open_workspace(path: string, enables?: FeatureID[]): Promise<Workspace> {
   const ws = new Workspace()

   const package_json = JSON.parse((await Fsp.readFile("package.json")).toString())
   ws.constants = package_json.constants || {}

   await discover_components(path, ws, enables)

   for (const [path, desc] of ws.declarations) {
      const baseDir = Path.dirname(path)
      if (desc.application) {
         const { entry } = desc.application
         const app = {
            ...desc.application,
            entry: resolve_entry_path(entry, baseDir),
         }
         ws.applications.push(app)
         console.log(`+ application: ${app.name} : http://localhost:3000/${app.name}.html`)
      }
      for (const ref in desc.entries) {
         ws.entries[ref] = resolve_entry_path(desc.entries[ref], baseDir)
         console.log(`+ entry: ${ref} -> ${ws.entries[ref]}`)
      }
   }

   const entryfiles = {}
   for (const url in ws.entries) {
      entryfiles[ws.entries[url]] = url
   }
   for (const [path, desc] of ws.components) {
      const { id } = desc

      const manifest: Partial<ComponentDescriptor> = {
         ...desc,
         application: undefined,
         publish: undefined,
         collections: undefined,
         entries: undefined,
      }
      ws.manifests[id] = manifest
      console.log(`+ manifest: ${id}`)

      if (desc.attachments) {
         const baseDir = Path.dirname(path)
         manifest.attachments = {}
         for (const name in desc.attachments) {
            const parts = desc.attachments[name].split("#")
            const file = resolve_entry_path(parts[0], baseDir)
            let ref = entryfiles[name]
            if (!ref) {
               ref = make_filename("addon_" + compute_hashID(file))
               ws.entries[ref] = file
            }
            manifest.attachments[name] = `./${ref}.js#${parts[1] || "default"}`
            console.log(`+ attachment: ${id}#${name} -> ${manifest.attachments[name]}`)
         }
      }
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

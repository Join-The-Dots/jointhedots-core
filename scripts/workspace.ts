import Fsp from "node:fs/promises"
import Process from "node:process"
import Path from "node:path"
import Crypto from "node:crypto"

type FeatureID = string // Identifier of feature
type CatalogID = string // Identifier of catalog
type ModuleID = string // Location of esm file: ./{module_path}
type ExportID = ModuleID // Location of esm export: ./{module_path}#{export_name}

type CatalogEntry = {
   module: ExportID
   [meta: string]: any
}

type CatalogCollection = {
   module: ExportID
   catalog: CatalogID
   typing?: ExportID
   lazy?: boolean
}

type ApplicationEntry = {
   title: string,
   name: string
   entry: ModuleID
}

type Publication = {
   id?: string
   name?: string
   features?: FeatureID[]
   application?: ApplicationEntry
   publish?: {
      [catalog: CatalogID]: CatalogEntry[]
   }
   collections?: {
      [filename: string]: CatalogCollection
   }
   entries?: {
      [url: string]: string
   }
   attachments?: {
      [name: string]: string
   }
   [metadata: string]: any
}

class Workspace {
   publications = new Map<string, Publication>()
   applications: ApplicationEntry[] = []
   entries: { [url: string]: string } = {}
   constants: { [key: string]: string | number } = {}
   manifests: { [url: string]: any } = {}
}

function is_enabled_publication(features?: FeatureID[], enables?: FeatureID[]) {
   if (enables && features) return features.reduce((val, ft) => enables.includes(ft) || val, false)
   return true
}

async function discover_publications(path: string, publications: Map<string, Publication>, enables?: FeatureID[]) {
   const pub_dir_name = "publication.json"
   const pub_file_ext = ".publication.json"

   for (const fname of await Fsp.readdir(path)) {
      const fpath = `${path}/${fname}`
      const fstat = await Fsp.stat(fpath)
      if (fstat.isDirectory()) {
         await discover_publications(fpath, publications, enables)
      }
      else {
         if (fname === pub_dir_name || fname.endsWith(pub_file_ext)) {
            try {
               const data = await Fsp.readFile(fpath)
               const pub = JSON.parse(data.toString()) as Publication
               if (is_enabled_publication(pub.features, enables)) {
                  publications.set(fpath, pub)
                  console.log("+ publication:", fpath)
               }
            }
            catch (e) {
               console.log(`! invalid 'publication.json' at ${fpath}: ${e?.message}`)
            }
         }
      }
   }
   return publications
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
   publication: Publication
   publication_path: string
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
         `] as ${this.exportType}[]`,
         ``,
      ].join("\n")
   }
}

function generate_reference(gen: GenerationOutput, ref: string, env: CollectionGenerationEnv): string {
   if (ref.startsWith(".")) {
      const mod_parts = ref.split("#")
      const mod_path = make_relative_path(env.collect_dir, env.publication_path, mod_parts[0])
      if (env.collect.lazy) {
         return `async () => (await import("${mod_path}")).${mod_parts[1] || "default"}`
      }
      else {
         return gen.add_import(mod_path, mod_parts[1] || "default")
      }
   }
   else if (ref.startsWith("pub:")) {
      return JSON.stringify(get_data_at(ref.slice(4), env.publication))
   }
   else {
      throw `Invalid $ref '${ref}' at publication '${env.publication_path}'`
   }
}

async function generate_collection(name: string, baseDir: string, collect: CatalogCollection, ws: Workspace) {
   const env: CollectionGenerationEnv = {
      ws,
      collect,
      collect_name: name,
      collect_dir: baseDir,
      publication: null as any,
      publication_path: null as any,
   }
   const gen = new GenerationOutput()
   if (collect.typing) {
      const typing = collect.typing.split("#")
      if (typing.length !== 2) {
         throw `Invalid typing '${collect.typing}' at collection '${env.publication_path}#${name}'`
      }
      gen.set_export_type(typing[0], typing[1])
   }
   for (const [path, pub] of ws.publications) {
      const entries = pub.publish?.[collect.catalog]
      if (entries) {
         env.publication = pub
         env.publication_path = path
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

export async function update_workspace_collections(ws: Workspace) {
   for (const [path, pub] of ws.publications) {
      for (const name in pub.collections) {
         const file = `${Path.dirname(path)}/${name}.ts`
         console.log("+ update:", file)
         const code = await generate_collection(name, path, pub.collections[name], ws)
         await Fsp.writeFile(file, code)
      }
   }

   const manifest_dir = "dist/manifest"
   await Fsp.mkdir(manifest_dir, { recursive: true })
   for (const id in ws.manifests) {
      const file = manifest_dir + "/" + encodeURIComponent(id) + ".json"
      await Fsp.writeFile(file, JSON.stringify(ws.manifests[id], null, 2))
   }
}

export async function open_workspace(path: string, enables?: FeatureID[]): Promise<Workspace> {
   const ws = new Workspace()

   const package_json = JSON.parse((await Fsp.readFile("package.json")).toString())
   ws.constants = package_json.constants || {}

   await discover_publications(path, ws.publications, enables)

   for (const [path, pub] of ws.publications) {
      if (pub.application) {
         const { entry } = pub.application
         const app = {
            ...pub.application,
            entry: make_relative_path(Process.cwd(), Path.dirname(path), entry),
         }
         ws.applications.push(app)
         console.log(`+ application: ${app.name} : http://localhost:3000/${app.name}.html`)
      }
      for (const ref in pub.entries) {
         ws.entries[ref] = make_relative_path(Process.cwd(), path, pub.entries[ref])
         console.log(`+ entry: ${ref} -> ${ws.entries[ref]}`)
      }
   }

   const entryfiles = {}
   for (const url in ws.entries) {
      entryfiles[ws.entries[url]] = url
   }
   for (const [path, pub] of ws.publications) {
      const { id } = pub
      if (id) {

         const manifest: Partial<Publication> = {
            ...pub,
            application: undefined,
            publish: undefined,
            collections: undefined,
            entries: undefined,
         }
         ws.manifests[id] = manifest
         console.log(`+ manifest: ${id}`)

         if (pub.attachments) {
            manifest.attachments = {}
            for (const name in pub.attachments) {
               const parts = pub.attachments[name].split("#")
               const file = make_relative_path(Process.cwd(), Path.dirname(path), parts[0])
               let ref = entryfiles[name]
               if (!ref) {
                  ref = make_filename("addon_" + compute_hashID(file))
                  ws.entries[ref] = file
               }
               manifest.attachments[name] = `/${ref}.js#${parts[1] || "default"}`
               console.log(`+ attachment: ${id}#${name} -> ${manifest.attachments[name]}`)
            }
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

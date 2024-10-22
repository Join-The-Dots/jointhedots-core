import * as esbuild from 'esbuild'
import Fsp from "node:fs/promises"
import Fs from 'node:fs'
import Path from 'node:path'
import MIME from 'mime'
import { IStorageStream } from './workspace'

export class SourceEventEmitter {
   clients: any[] = []
   sendEventsToAll(type: string, data: any) {
      this.clients.forEach(client =>
         client.res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
      )
   }
   route(): (req, res) => void {
      return (req, res) => {
         res.setHeader('Content-Type', 'text/event-stream')
         res.setHeader('Cache-Control', 'no-cache')
         res.setHeader('Connection', 'keep-alive')
         res.write('retry: 10000\n\n')
         this.clients.push({ id: Date.now(), res })
         req.on('close', () => {
            this.clients = this.clients.filter(client => client.res !== res)
         })
      }
   }
}

export class StorageFiles implements IStorageStream {
   files = new Map<string, esbuild.OutputFile>()
   on_changes = new SourceEventEmitter()
   baseDir: string = ""
   constructor(baseDir: string) {
      this.baseDir = Path.resolve(baseDir)
   }
   clean() {
      removeDirectory(this.baseDir)
   }
   commit(key: string, contentData: Uint8Array | string, contentType?: string) {
      const fpath = Path.join(this.baseDir, key)
      Fs.mkdirSync(Path.dirname(fpath), { recursive: true })
      Fs.writeFileSync(fpath, contentData)
   }
   route(): (req, res) => void {
      return (req, res) => {
         const fpath = Path.resolve(Path.join(this.baseDir, req.path))
         const file = this.files.get(fpath)
         res.setHeader("Content-Type", MIME.getType(req.path))
         if (file) {
            res.send(Buffer.from(file.contents))
         }
         else {
            res.sendFile(fpath, (err) => { if (err) res.status(500).send(err.message) })
         }
      }
   }
   plugin(): esbuild.Plugin {
      return {
         name: "dipatch-files",
         setup: (build) => {
            build.onEnd((result) => {
               const { outputFiles } = result
               if (outputFiles) {
                  const files = new Map<string, esbuild.OutputFile>()
                  const changes = { added: [] as string[], updated: [] as string[], }
                  for (const file of outputFiles) {
                     const prev = this.files.get(file.path)
                     let changed = prev ? prev.hash !== file.hash : true
                     if (changed) {
                        if (!prev) changes.added.push(Path.basename(file.path))
                        else changes.updated.push(Path.basename(file.path))
                        Fs.writeFileSync(file.path, file.contents)
                     }
                     files.set(file.path, file)
                  }
                  const removed = this.files.size - files.size - changes.added.length
                  if (removed !== 0 || changes.added.length !== 0 || changes.updated.length !== 0) {
                     console.log(`[output] update ${changes.added.length + changes.updated.length} files(s)`)
                     this.files = files
                     this.on_changes.sendEventsToAll("change", changes)
                  }
                  else {
                     console.log(`[output] no changes`)
                  }
               }
               return null
            })
         }
      }
   }
}

export function copyToStorageStream(storage: IStorageStream, key: string, path: string, contentType?: string) {
   const fstat = Fs.statSync(path)
   if (fstat.isFile()) {
      storage.commit(key, Fs.readFileSync(path), contentType || MIME.getType(path))
   }
   else if (fstat.isDirectory()) {
      for (const fname of Fs.readdirSync(path)) {
         const fpath = Path.join(path, fname)
         const fkey = key ? `${key}/${fname}` : fname
         copyToStorageStream(storage, fkey, fpath, contentType)
      }
   }
}

export function removeFile(path: string) {
   if (Fs.existsSync(path)) {
      Fs.unlinkSync(path)
   }
}

export function removeDirectory(path: string) {
   if (Fs.existsSync(path) && Fs.lstatSync(path).isDirectory()) {
      Fs.readdirSync(path).forEach(function (entry) {
         var entry_path = Path.join(path, entry)
         if (Fs.lstatSync(entry_path).isDirectory()) {
            removeDirectory(entry_path)
         }
         else {
            try { removeFile(entry_path) }
            catch (e) { return }
         }
      })
      Fs.rmdirSync(path)
   }
}

export async function readJsonFile<T = any>(path: string): Promise<T> {
   try {
      return JSON.parse((await Fsp.readFile(path)).toString())
   } catch (e) {
      return undefined
   }
}

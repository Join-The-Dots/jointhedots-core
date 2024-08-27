import * as esbuild from 'esbuild'
import Fs from 'node:fs'
import Path from 'node:path'
import MIME from 'mime'

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

export class StorageFiles {
   files = new Map<string, esbuild.OutputFile>()
   on_changes = new SourceEventEmitter()
   constructor(
      readonly baseDir: string,
   ) {
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

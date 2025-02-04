import { MapLike } from "../common/types"
import { DocumentModel, ElementKey } from "./model"
import { ElementJSON, serializeElement } from "./serde"

export const DocumentDraftFormatVersion = 1

export type DocumentChangeMap = {
   [$key: ElementKey]: ElementJSON | null
}

export type DocumentChangeSet = {
   // Committed changes set
   updates: DocumentChangeMap
}

export type DocumentCheckpoint = DocumentChangeSet & {
   // Patched version
   version: number
   // Backups for rollback
   backups: DocumentChangeMap
}

export type DocumentLogState = {
   version: number
   nodes: MapLike<ElementJSON>
}

export class DocumentChangeLog {
   static Revision: number = 0 // Current log revision id (for storage management)
   version: number = 0
   replayables: DocumentCheckpoint[] = []
   checkpoints: DocumentCheckpoint[] = []
   nodes: MapLike<ElementJSON> = {}

   constructor(readonly model: DocumentModel) {
      for (const element of model.nodes.values()) {
         this.nodes[element.$key] = serializeElement(element)
      }
      createDocumentDraft(this)
   }
   commit(changes: DocumentChangeSet | DocumentCheckpoint) {
      const { model } = this
      let backups: DocumentChangeMap = changes["backups"]
      if (!backups) {
         backups = {}
         for (const key in changes.updates) {
            backups[key] = this.nodes[key]
            this.nodes[key] = changes.updates[key]
         }
         if (this.replayables.length > 0) {
            this.replayables = []
         }
      }
      this.checkpoints.push({
         version: model.version++,
         backups,
         ...changes,
      })
   }
   undo(): boolean {
      const ckp = this.checkpoints.pop()
      if (ckp) {
         for (const key in ckp.backups) {
            this.nodes[key] = ckp.backups[key]
         }
         this.replayables.push(ckp)
         return true
      }
      return false
   }
   redo(): boolean {
      const changes = this.replayables.pop()
      if (changes) {
         this.commit(changes)
         return true
      }
      return false
   }
   state(): DocumentLogState {
      return {
         version: this.version,
         nodes: this.nodes,
      }
   }
}

export function createDocumentDraft(log: DocumentChangeLog): Blob {
   const data = {
      id: log.model.id,
      version: log.version,
      format: DocumentDraftFormatVersion,
      checkpoints: log.checkpoints,
      replayables: log.replayables,
      nodes: log.nodes,
   }
   console.log(data)
   return new Blob([JSON.stringify(data)], { type: "application/ldx.draft" })
}

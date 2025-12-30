import { ServiceEntry } from "services"


export type NameSpaceId = string
export type FileKey = string
export type ChangeSetId = string

export type FilePatch = {
   start: number
   end: number
   data: string
}

export type FileChange = {
   key: FileKey
   prev_key?: FileKey
   removed?: boolean
   changes: FilePatch[]
}

export type Author = {
   name: string
   email?: string
}

export type StorageChangeInfos = {
   message?: string
   authors?: Author[]
}

export type StorageChangeStatus = StorageChangeInfos & {
   id: ChangeSetId
   from?: ChangeSetId | ChangeSetId[]
   emitted_at?: Date
}

export type StorageChangeSet = StorageChangeStatus & {
   changes?: FileChange[]
}

export type StorageChangeLog = {
   changes: StorageChangeStatus[]
}

export type StorageStats = {
   file_count?: number
   used_bytes?: number
   limit_used_bytes?: number
   limit_file_count?: number
}

export type StorageTransaction = StorageChangeInfos & {
   files: {
      [key: FileKey]: {
         prev_key?: string
         remove?: boolean
         data?: Blob | string
      }
   }
}

export interface StorageService {

   readonly location: string

   // File access
   list(): Promise<FileKey[]>
   stats(): Promise<StorageStats>
   read(key: FileKey): Promise<Blob>
   write(key: FileKey, data: Blob): Promise<void>
   recall(key: FileKey, at: ChangeSetId): Promise<Blob>
   commit(transaction: StorageTransaction): Promise<ChangeSetId>

   // File change management
   getChangeSet(id: ChangeSetId): Promise<StorageChangeSet>
   getChangeLog(): Promise<StorageChangeLog>
   getFileLog(key: FileKey): Promise<StorageChangeLog>
}

export type StorageDescriptor = void

export const StorageServiceKey = new ServiceEntry<StorageService, StorageDescriptor>("storage")


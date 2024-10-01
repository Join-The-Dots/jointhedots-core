import { DataBreakupOnPath, findObjectPath } from "./ast-updater"

type Versionned<T> = T & { revision?: number }

export class AstHistoryMap<Data = any> {
   versions: Versionned<Data>[] = []
   forwards: Versionned<Data>[] = null
   public pushVersion(data) {
      if (this.versions.includes(data)) {
         throw new Error(`Cannot set the same data twice`)
      }
      const prevData = this.lastVersion()
      if (!prevData) {
         if (isNaN(data.revision)) data.revision = 0
         this.versions.push(data)
      }
      else {
         data.revision = prevData.revision + 1
         this.versions.push(data)
      }
      this.forwards = null
   }
   public redoVersion() {
      if (this.forwards) {
         const data = this.forwards.pop()
         this.versions.push(data)
         if (this.forwards.length === 0) {
            this.forwards = null
         }
      }
   }
   public undoVersion(): Versionned<Data> {
      const data = this.versions.pop()
      if (this.forwards === null) this.forwards = []
      this.forwards.push(data)
      return this.lastVersion()
   }
   public lastVersion(): Versionned<Data> {
      return this.versions[this.versions.length - 1]
   }
   public setAtPath(path: string, data: Object, versioning: boolean = true) {
      const infos = DataBreakupOnPath.breakup(path.split("/"), this.lastVersion())
      infos.data = data
      if (versioning !== true) this.versions.pop()
      this.pushVersion(infos.remake())
   }
   public getPathOf(data: Object): string {
      return findObjectPath(data, this.lastVersion())
   }
}


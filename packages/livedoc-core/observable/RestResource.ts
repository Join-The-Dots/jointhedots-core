import { print } from "../common/console"
import { Observable } from "./observable"
import { HttpStatusAttribute } from "./attributes"

export class RestResource<T extends Object> extends Observable<T> {
   loaded: boolean = false
   query: Promise<T> = null
   status = 0
   constructor(readonly url: string) {
      super()
   }
   async use(): Promise<T> {
      if (this.loaded === false) {
         if (this.query === null) {
            this.query = fetch(this.url).then(async res => {
               const data = await res.json()
               Object.assign(this.state, data)
               this.status = res.status
               this.query = null
               this.loaded = true
               this.notify()
               return this.image
            }, (e) => {
               print.error(e)
               this.loaded = true
               return this.image
            })
         }
         return this.query
      }
      return this.image
   }
   override get(target: T, key: PropertyKey): any {
      if (typeof key === "string") {
         if (this.loaded === false) {
            return this.use().then(() => {
               return this.state[key]
            })
         }
      }
      else if (key === HttpStatusAttribute) {
         return this.status
      }
      return super.get(target, key)
   }
   override set(target: T, key: PropertyKey, value: any): boolean {
      if (this.loaded === false) {
         console.error(`Resource '${this.url}' not ready for assignement`)
         return true
      }
      return super.set(this.state, key, value)
   }
}

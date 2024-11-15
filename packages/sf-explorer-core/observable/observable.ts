import { ObservableAttribute } from "./attributes"


export type Observer = (target, key: PropertyKey) => void

export class Observable<T extends Object> implements ProxyHandler<T> {
   observers: (Observer | string[])[]
   state: T
   image: T
   constructor() {
      this.observers = null
      this.state = {} as T
      this.image = new Proxy(this.state, this)
   }
   subscribe(observer: Observer, keys?: string[]) {
      if (this.observers === null) this.observers = []
      this.observers.push(observer, keys)
   }
   unsubscribe(observer: Observer) {
   }
   notify(key?: PropertyKey) {
      if (this.observers) {
         for (let i = 0; i < this.observers.length; i += 2) {
            const observer = this.observers[i] as Observer
            observer(this.image, key)
         }
      }
   }
   async use(keys?: string[]): Promise<T> {
      return this.image
   }
   get(target: T, key: PropertyKey): any {
      if (key === ObservableAttribute) return this
      return Reflect.get(this.state, key)
   }
   set(target: T, key: PropertyKey, value: any): boolean {
      if (this.state[key] !== value) {
         this.state[key] = value
         this.notify(key)
      }
      return true
   }
   ownKeys(target: T) {
      return Reflect.ownKeys(this.state)
   }
   has(target: T, key: PropertyKey) {
      return Reflect.has(this.state, key)
   }
}


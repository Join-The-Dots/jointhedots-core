
export type ObjectClass<T extends Object = any> = new (...args) => T

export type Overwrite<Base, Overrides> = Omit<Base, keyof Overrides> & Overrides

export type Async<T> = T | Promise<T>

export type OneOrMany<T> = T | T[]

export function areSimilarObjects(x: Record<string, any>, y: Record<string, any>): boolean {
   for (const key in x) {
      if (x[key] !== y[key]) {
         return false
      }
   }
   for (const key in y) {
      if (x[key] !== y[key]) {
         return false
      }
   }
   return true
}

export function* listOneOrMany<T>(cnt: OneOrMany<T>): Generator<T> {
   if (Array.isArray(cnt)) { for (const c of cnt) yield c }
   else if (cnt) yield cnt
}

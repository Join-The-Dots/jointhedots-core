
type DataBreakupLevel = {
   key: string
   data: any
}

class DataBreakupOnPath {
   constructor(
      readonly stack: DataBreakupLevel[],
      public data: any,
   ) { }
   static breakup(keys: string[], data: any): DataBreakupOnPath {
      const stack: DataBreakupLevel[] = []
      for (let i = keys[0] === "" ? 1 : 0; i < keys.length; i++) {
         const key = keys[i]
         stack.push({ key, data })
         if (data instanceof Object) data = data[key]
         else data = undefined
      }
      return new DataBreakupOnPath(stack, data)
   }
   static find(what: Object, data: any): DataBreakupOnPath {
      const rstack: DataBreakupLevel[] = []
      if (recursiveSearchObject(what, data, rstack)) {
         return new DataBreakupOnPath(rstack.reverse(), what)
      }
      return null

      function recursiveSearchObject(what: Object, data: any, rstack: DataBreakupLevel[]): boolean {
         if (data instanceof Object) {
            if (data === what) {
               return true
            }
            if (Array.isArray(data)) {
               for (let i = 0; i < data.length; i++) {
                  if (recursiveSearchObject(what, data[i], rstack)) {
                     rstack.push({ key: i.toString(), data: data })
                     return true
                  }
               }
            }
            else if (exactInstanceOf(data, Object)) {
               for (const key in data) {
                  if (recursiveSearchObject(what, data[key], rstack)) {
                     rstack.push({ key, data: data })
                     return true
                  }
               }
            }
            else {
               return false
            }
         }
         return false
      }
   }
   get keys(): string[] {
      return this.stack.map(x => x.key)
   }
   get path(): string {
      return this.keys.join("/")
   }
   front(index: number) {
      if (index < this.stack.length) {
         return this.stack[this.stack.length - index]
      }
   }
   back(index: number) {
      if (index < this.stack.length) {
         return this.stack[this.stack.length - 1 - index]
      }
   }
   setBack(index: number, value: DataBreakupLevel) {
      if (index < this.stack.length) {
         this.stack[this.stack.length - 1 - index] = value
      }
   }
   remake(): any {
      let content = cleanDataUndefined(this.data)
      for (let i = this.stack.length - 1; i >= 0; i--) {
         let { key, data } = this.stack[i]
         if (data instanceof Object && data[key] !== content) {
            if (Array.isArray(data)) {
               data = data.slice()
               data[key] = content
            }
            else {
               data = {
                  ...data,
                  [key]: content,
               }
               if (content === undefined) {
                  delete data[key]
               }
            }
         }
         else if (data === undefined) {
            data = {
               [key]: content,
            }
         }
         content = data
      }
      return content
   }
}

function exactInstanceOf(obj: Object, cls: new (...args) => Object) {
   return obj?.["constructor"] === cls
}

export function cleanDataUndefined<T extends any>(data: T): T {
   if (data instanceof Object) {
      if (Array.isArray(data)) {
         data.forEach(x => cleanDataUndefined(x))
      }
      else if (exactInstanceOf(data, Object)) {
         for (const key in data) {
            if (data[key] !== undefined) {
               cleanDataUndefined(data[key])
            }
            else {
               delete data[key]
            }
         }
      }
      else {
         // ignored
      }
   }
   return data
}

export function copyData<T extends any>(data: T): T {
   if (data instanceof Object) {
      if (Array.isArray(data)) {
         return data.map(x => copyData(x)) as T
      }
      else if (exactInstanceOf(data, Object)) {
         return Object.keys(data).reduce((x, k) => {
            x[k] = copyData(data[k])
            return x
         }, {}) as T
      }
      else if (typeof data["$ref"] === "string") {
         return { $ref: data["toRef"]() } as T
      }
      else {
         // ignored
      }
   }
   return data
}

export function checkDataEquals(data1: any, data2: any): boolean {
   if (data1 === data2) {
      return true
   }
   if (typeof data1 !== typeof data2) {
      return false
   }
   if (data1 instanceof Object) {
      if (data1.constructor !== data2.constructor) {
         return false
      }
      if (Array.isArray(data1)) {
         if (data1.length !== data2.length) {
            return false
         }
         for (let i = 0; i < data1.length; i++) {
            if (checkDataEquals(data1[i], data2[i]) === false) {
               return false
            }
         }
         return true
      }
      else if (exactInstanceOf(data1, Object)) {
         if (checkDataEquals(Object.keys(data1), Object.keys(data2)) === false) {
            return false
         }
         for (const key in data1) {
            if (checkDataEquals(data1[key], data2[key]) === false) {
               return false
            }
         }
         return true
      }
      else if (typeof data1["$ref"] === "string") {
         return data1.$ref === data2.$ref
      }
      else {
         // ignored
      }
   }
   return false
}

export function getDataAtKeys(keys: string[], content: Object): any {
   for (let i = keys[0] === "" ? 1 : 0; i < keys.length; i++) {
      if (content instanceof Object) {
         content = content[keys[i]]
         if (content === undefined) {
            return undefined
         }
      }
      else {
         return undefined
      }
   }
   return content
}

export function getDataAtPath(path: string, content: Object): any {
   const keys = path ? path.split("/") : []
   return getDataAtKeys(keys, content)
}

export function setDataAtPath(path: string, data: any, content: Object): any {
   const infos = DataBreakupOnPath.breakup(path.split("/"), content)
   infos.data = data
   return infos.remake()
}

export function findDataObjectPath(what: Object, content: Object): string {
   const infos = DataBreakupOnPath.find(what, content)
   if (infos) return infos.path
   return null
}

export function findDataObjectKeys(what: Object, content: Object): string[] {
   const infos = DataBreakupOnPath.find(what, content)
   if (infos) return infos.keys
   return null
}

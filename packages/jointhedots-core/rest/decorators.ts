import type { Handler } from 'hono'

export type RESTClass<T extends Object = any> = new (...args: any[]) => T

export type RESTResourceInfos = {
   path?: string
   public?: boolean
}

export type RESTMethodInfos = {
   public?: boolean
}

export class RESTApi {
   constructor(
      readonly target: RESTClass,
      readonly descriptor: RESTResourceInfos
   ) {
   }
   setDescriptor(descriptor: RESTResourceInfos) {
      Object.assign(this.descriptor, descriptor)
   }
   *getMethods() {
      const { prototype } = this.target
      for (const key of Object.getOwnPropertyNames(prototype)) {
         const meth = RESTApis.Methods.get(prototype[key])
         if (meth) {
            yield meth
         }
      }
   }
   create() {
      return new this.target()
   }
}

export class RESTMethod {
   constructor(
      readonly name: string,
      readonly invoked: Function,
      readonly descriptor: RESTMethodInfos,
   ) {
   }
}

const RESTApis = {
   Resources: new Map<RESTClass, RESTApi>(),
   Methods: new Map<Function, RESTMethod>(),
}

export function getRESTApis() {
   return RESTApis
}

export const REST = {
   Resource<T extends RESTClass>(infos?: RESTResourceInfos) {
      return function (target: T) {
         const entry = new RESTApi(target, {
            path: "/" + target.name,
            public: false,
            ...infos,
         })
         target["api"] = entry
         RESTApis.Resources.set(target, entry)
         return target
      }
   },
   Method(infos?: RESTMethodInfos) {
      return function (target: Handler, context: ClassMethodDecoratorContext) {
         const entry = new RESTMethod(context.name as string, target, infos)
         RESTApis.Methods.set(target, entry)
      }
   },
} 

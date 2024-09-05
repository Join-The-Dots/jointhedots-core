import type { IComponentProvider, IContentProvider, IModuleProvider } from "core/components/providers"
import SHA256 from 'crypto-js/sha256.js'
import base64url from 'crypto-js/enc-base64url.js'
import { encode_base64url } from "core/common/base64url"
import Listenable from "components/Events/listenable"
import { ComponentsRegistry } from "./components/registry"
import { IUrlResolver } from "./types/services"

export class SymbolManifold {
   registry = new Map<string, Symbol>()
   get(identity: string): Symbol {
      let sym = this.registry.get(identity)
      if (!sym) this.registry.set(identity, sym = Symbol(identity))
      return sym
   }
}

export enum CoreStatus {
   NotLoaded,
   Installing,
   Loading,
   Ready,
}

export class Core extends Listenable {
   symbols = new SymbolManifold()
   components = ComponentsRegistry

   edition: boolean = false
   simulation: boolean = false
   status: CoreStatus = CoreStatus.NotLoaded
   storage: IContentProvider = null
   url_resolver: IUrlResolver = null
   component_provider: IComponentProvider = null

   async use(): Promise<Core> {
      if (this.status === CoreStatus.NotLoaded) {

         // Installing configure providers
         this.status = CoreStatus.Installing
         await this.executeEvent("install")

         // Setup resources
         this.status = CoreStatus.Loading
         await this.executeEvent("load")

         // Startup application
         this.status = CoreStatus.Ready
         await this.executeEvent("ready")
      }
      return this
   }
}

export const CoreInstance = new Core()

declare var window
window.Polycubic = CoreInstance

export function ComputeResourceHashID(norm: string, identity: string, namespace?: string): string {
   const hash = SHA256((namespace || "") + '\0' + norm + '\0' + identity)
   return hash.toString(base64url)
}

export function ComputeResourceXRID(norm: string, identity: string) {
   return norm + "/" + encode_base64url(identity)
}

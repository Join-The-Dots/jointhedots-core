
import type { MapLike } from "typescript"
import type { JSONSchema, SecurityRule, SecurityGuard } from "../../schema/schema.ts"
import { acquireComponent, acquireResource, ComponentEntry } from "../../components/manifold.ts"
import type { ComponentManifest } from "../../components/components.ts"
import { ServiceEntry } from "../../services/service-entry.ts"

// Simple query string utilities to replace query-string package
const qs = {
   stringify(params: Record<string, any>, options?: { skipNull?: boolean, skipEmptyString?: boolean }): string {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params || {})) {
         if (options?.skipNull && value === null) continue
         if (options?.skipEmptyString && value === "") continue
         if (Array.isArray(value)) {
            for (const v of value) searchParams.append(key, String(v))
         } else {
            searchParams.set(key, String(value))
         }
      }
      return searchParams.toString()
   },
   parse(query: string, options?: { parseNumbers?: boolean, parseBooleans?: boolean }): Record<string, any> {
      const params: Record<string, any> = {}
      const searchParams = new URLSearchParams(query)
      for (const [key, value] of searchParams.entries()) {
         params[key] = value
      }
      return params
   }
}

// View service key for accessing view schemas
export const ViewServiceKey = new ServiceEntry<any, JSONSchema>("view")

export type ViewInfos = {
   name: string
   params?: Record<string, ViewParam | ViewParam[] | MapLike<ViewParam>>
   content?: string
   nested?: ViewInfos
}

export type ViewParam = string | boolean | number

export type ViewInvokable = {
   component: ComponentEntry
   properties?: MapLike<string>
}

export function getViewReferenceFrom(data: string | ViewInfos): string {
   if (!data) return ""
   if (data instanceof Object) {
      const parts: string[] = []
      while (data) {
         const queryPart = qs.stringify(data.params, {
            skipNull: false,
            skipEmptyString: false,
         })
         if (queryPart) parts.push(`${data.name}?${queryPart}`)
         else parts.push(data.name)
         data = data.nested
      }
      return parts.join("/")
   }
   if (data.startsWith('#')) {
      return data.slice(1)
   }
   return data
}

export function getViewInfosFrom(data: string | ViewInfos, content?: string): ViewInfos {
   if (!data) return null
   if (data instanceof Object) return data
   let root: ViewInfos = null, last: ViewInfos = null
   data = data.startsWith('#') ? data.slice(1) : data
   for (const part of data.split('/')) {
      if (part) {
         const [name, query] = part.split('?')
         let params = {}
         if (query) {
            params = qs.parse(query, {
               parseNumbers: false,
               parseBooleans: false,
            })
         }
         const view = {
            name,
            params,
         }
         if (last) last.nested = view
         else root = view
         last = view
      }
   }
   if (last) last.content = content
   return root
}

function checkValue(security: SecurityGuard, data: any): Error {
   if (security === "safe") {
      return null
   }
   else if (!security) {
      return new Error(`Data cannot be securised`)
   }
   else {
      const rule_id = (typeof security === "string") ? security : security?.rule
      const guard = acquireResource(rule_id).get<SecurityRule>()
      if (guard) {
         try {
            return guard.check(data, (security instanceof Object) ? security : null)
         }
         catch (e) {
            return e
         }
      }
      else {
         return new Error(`Data security guard not found`)
      }
   }
}

function parseValue(schema: JSONSchema, data: any, safe: boolean): any {
   if (data !== undefined) {
      if (safe !== true) {
         const err = checkValue(schema?.security, data)
         if (err) throw err
      }
      return data
   }
   else {
      return schema.default
   }
}

function parseViewProps(component: ComponentEntry, manifest: ComponentManifest, view: ViewInfos, origin: string): MapLike<any> {
   const props = {} as MapLike<any>
   const schema = ViewServiceKey.spec(component)

   const safe = origin === "safe"
   /* if (safe !== true) {
      const allow = schema?.["allow-origin"]
      if (allow !== "*" && allow?.split(";")?.includes(origin) !== true) {
         throw new Error(`Data not allowed from '${origin}'`)
      }
   } */

   const properties = schema?.properties
   if (properties instanceof Object) {
      const { content } = view
      let params = view.params || {}

      const aliases = schema.aliases
      if (aliases) {
         const remappeds = {}
         for (const key in params) {
            const new_key = aliases?.[key] || key
            remappeds[new_key] = params[key]
         }
         params = remappeds
      }

      for (const propName in properties) {
         const propShema = properties[propName]
         let propData = params[propName]
         if (content !== undefined && propShema?.binding?.source === "content") {
            propData = content
         }
         try {
            props[propName] = parseValue(propShema, propData, safe)
         }
         catch (e) {
            throw new Error(`Invalid param '${propName}' : ${e.message}`)
         }
      }
   }
   return props
}

export async function evaluateViewInfos(view: string | ViewInfos, origin?: string): Promise<ViewInvokable> {
   if (typeof view === "string") view = getViewInfosFrom(view)
   const component = acquireComponent(view.name)
   const manifest = await component.fetch()
   if (component.valid) {
      const properties = parseViewProps(component, manifest, view, origin || "unknown")
      return {
         component,
         properties,
      }
   }
   else {
      throw new Error(`Component '${component.id}' is invalid`)
   }
}

export function getViewURL(view: string | ViewInfos, inside?: string | ViewInfos): string {
   const { origin, pathname } = window.location
   if (typeof view === "string") view = getViewInfosFrom(view)
   if (inside) {
      if (typeof inside === "string") inside = getViewInfosFrom(origin)
      view = { ...inside, nested: view }
   }
   const hash = "#" + getViewReferenceFrom(view)
   return `${origin}${pathname}${hash}`
}

export function gotoURLView(view: string | ViewInfos, inside?: string | ViewInfos) {
   const { origin } = window.location
   if (typeof view === "string") view = getViewInfosFrom(view)
   if (inside) {
      if (typeof inside === "string") inside = getViewInfosFrom(origin)
      view = { ...inside, nested: view }
   }
   const hash = "#" + getViewReferenceFrom(view)
   window.location.assign(hash)
}

export function updateURLView(view: string | ViewInfos) {
   if (typeof view === "string") view = getViewInfosFrom(view)
   const current = getViewInfosFrom(window.location.hash)
   const hash = "#" + getViewReferenceFrom({
      ...view,
      params: {
         ...current.params,
         ...view.params,
      }
   })
   window.location.replace(hash)
}

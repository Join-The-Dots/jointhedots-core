
import { ComponentsRegistry } from "./components"
import React, { ReactElement, useEffect, useState } from "react"
import { MapLike } from "typescript"
import { useLocation } from "react-router-dom"
import { ErrorDisplayer } from "../react"
import qs from 'query-string';
import { JSONSchema, SecurityRule, SecurityGuard } from "../ast/schema/schema"
import { ComponentManifest } from "./interfaces"

export type ViewDescriptor = {
   name: string
   params?: Record<string, string | string[] | MapLike<string>>
   content?: string
}

export function getHashFromViewDescriptor(descriptor: ViewDescriptor): string {
   const queryPart = qs.stringify(descriptor.params, {
      skipNull: false,
      skipEmptyString: false,
   })
   if (queryPart) return `#${descriptor.name}?${queryPart}`
   else return `#${descriptor.name}`
}

export function getViewDescriptorFromHash(hash: string, content?: string): ViewDescriptor {
   let [name, queryPart] = hash.split('?')
   name = name.startsWith('#') ? name.slice(1) : name
   name = name.startsWith('/') ? name.slice(1) : name

   let params = {}
   if (queryPart) {
      params = qs.parse(queryPart, {
         parseNumbers: false,
         parseBooleans: false,
      })
   }

   return { name, params, content }
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
      const guard = ComponentsRegistry.acquireResource(rule_id).get<SecurityRule>()
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

function parseViewProps(manifest: ComponentManifest, descriptor: ViewDescriptor, origin: string): MapLike<any> {
   const props = {} as MapLike<any>
   const schema = manifest["view"] as JSONSchema

   const safe = origin === "safe"
   /* if (safe !== true) {
      const allow = schema?.["allow-origin"]
      if (allow !== "*" && allow?.split(";")?.includes(origin) !== true) {
         throw new Error(`Data not allowed from '${origin}'`)
      }
   } */

   const properties = schema?.properties
   if (properties instanceof Object) {
      const { content } = descriptor
      let params = descriptor.params || {}

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

const mapping = {
   rest: "query.rest",
   swagger: 'sobject.open-api',
   erd: 'sobject.erd',
   soql: "query.soql",
}

async function renderViewDescriptor(descriptor: ViewDescriptor, origin?: string, fallback?: ReactElement): Promise<ReactElement> {
   if (descriptor) {
      let name = descriptor.name
      // smoother transition from previously deployed components
      if (descriptor.params?.component) {
         name = mapping[descriptor.params.component.toString()] || descriptor.params.component.toString()
      }

      const comp = ComponentsRegistry.acquireComponent(name)
      if (comp) {
         try {
            const view = await comp.fetchResource("view.react")
            const props = parseViewProps(comp.manifest, descriptor, origin || "unknown")
            return React.createElement(view, props)
         }
         catch (e) {
            return <ErrorDisplayer error={e} />
         }
      }
      else {
         if (fallback) return fallback
         return <ErrorDisplayer error={new Error(`Component '${name}' not found`)} />
      }
   }
   return null
}

export function InvokeView(props: { descriptor: ViewDescriptor, origin?: string, fallback?: ReactElement }) {
   const { descriptor, origin, fallback } = props
   const [displayed, setDisplayed] = useState<ReactElement>(null)
   useEffect(() => {
      renderViewDescriptor(descriptor, origin, fallback).then(setDisplayed)
   }, [descriptor])
   if (displayed) return displayed
   else return null
}

export function InvokeUrlHashView(props: { hash: string, fallback?: ReactElement }) {
   const { hash, fallback } = props
   const [displayed, setDisplayed] = useState<ReactElement>(null)
   useEffect(() => {
      const desc = getViewDescriptorFromHash(hash)
      renderViewDescriptor(desc, "url", fallback).then(setDisplayed)
   }, [hash])
   if (displayed) return displayed
   else return null
}

export function InvokeURLView(props: { fallback?: ReactElement }) {
   const { hash } = window.location
   useLocation()
   return <InvokeUrlHashView hash={hash} fallback={props.fallback} />
}

export function getViewURL(descriptor: ViewDescriptor): string {
   const { origin, pathname } = window.location
   const hash = getHashFromViewDescriptor(descriptor)
   return `${origin}${pathname}${hash}`
}

export function gotoURLView(descriptor: ViewDescriptor) {
   const hash = getHashFromViewDescriptor(descriptor)
   window.location.assign(hash)
}

export function updateURLView(descriptor: ViewDescriptor) {
   const current = getViewDescriptorFromHash(window.location.hash)
   const hash = getHashFromViewDescriptor({
      ...descriptor,
      params: {
         ...current.params,
         ...descriptor.params,
      }
   })
   window.location.replace(hash)
}

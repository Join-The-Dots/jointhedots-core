
import { ComponentManifest, ComponentsRegistry } from "core/library"
import React, { ReactElement, useEffect, useState } from "react"
import { MapLike } from "typescript"
import { JSONSchema } from "./JSONSchema"
import { useLocation } from "react-router-dom"
import { ErrorDisplayer } from "core/ui/ErrorBoundary"
import qs from 'query-string';

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

function parseValue(schema: JSONSchema, data: any): any {
   if (data !== undefined) {
      return data
   }
   else {
      return schema.default
   }
}

function parseViewProps(manifest: ComponentManifest, descriptor: ViewDescriptor): MapLike<any> {
   const props = {} as MapLike<any>
   const schema = manifest["view"] as JSONSchema
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
         if (content !== undefined && propShema?.binding?.source === "content") {
            props[propName] = parseValue(propShema, content)
         }
         else {
            props[propName] = parseValue(propShema, params[propName])
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

async function renderViewDescriptor(descriptor: ViewDescriptor, fallback?: ReactElement): Promise<ReactElement> {
   if (descriptor) {
      let name = descriptor.name
      // smoother transition from previously deployed components
      if (descriptor.params?.component) {
         name = mapping[descriptor.params.component.toString()] || descriptor.params.component.toString()
      }

      const comp = ComponentsRegistry.acquireComponent(name)
      if (comp) {
         const view = await comp.fetchResource("view.react")
         const props = parseViewProps(comp.manifest, descriptor)
         return React.createElement(view, props)
      }
      else {
         if (fallback) return fallback
         return <ErrorDisplayer error={new Error(`Component '${name}' not found`)} />
      }
   }
   return null
}

export function InvokeView(props: { descriptor: ViewDescriptor, fallback?: ReactElement }) {
   const { descriptor, fallback } = props
   const [displayed, setDisplayed] = useState<ReactElement>(null)
   useEffect(() => {
      renderViewDescriptor(descriptor, fallback).then(setDisplayed)
   }, [descriptor])
   if (displayed) return displayed
   else return null
}

export function InvokeUrlHashView(props: { hash: string, fallback?: ReactElement }) {
   const { hash, fallback } = props
   const [displayed, setDisplayed] = useState<ReactElement>(null)
   useEffect(() => {
      const desc = getViewDescriptorFromHash(hash)
      renderViewDescriptor(desc, fallback).then(setDisplayed)
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

import { URI } from 'vscode-uri'
import { ComponentFilter, ComponentManifest, ComponentPublication } from './components'

export function parseComponentURI(ref: string): URI {
   if (ref.startsWith("./")) {
      const base = URI.parse(window.location.href)
      const parts = base.path.split("/")
      parts[parts.length - 1] = ref.slice(2)
      return base.with({ path: parts.join("/"), query: "", fragment: "" })
   }
   else if (ref.startsWith("/")) {
      return URI.parse(window.location.href).with({ path: ref, query: "", fragment: "" })
   }
   else {
      return URI.parse(ref)
   }
}

export function createComponentPublication(manif: ComponentManifest): ComponentPublication {
   const { $id } = manif
   return {
      component_id: $id,
      type: manif.type,
      icon: manif.icon,
      title: manif.title || manif.name || $id,
      services: manif.services ? Object.keys(manif.services) : [],
      description: manif.description || "",
      keywords: manif.keywords,
      tags: manif.tags,
   }
}

export function createComponentFilter(filter?: Partial<ComponentFilter>): ComponentFilter {
   const result: ComponentFilter = {
      query: filter?.query || "",
      pattern: filter?.pattern || null,
      tags: filter?.tags || [],
      keywords: filter?.keywords || [],
      services: filter?.services || [],
      types: filter?.types || [],
   }
   if (result.query.length > 0) {
      for (const kw of result.query.split(/\s/)) {
         if (kw.length > 0 && !result.keywords.includes(kw)) {
            result.keywords.push(kw)
         }
      }
   }
   if (result.keywords.length > 0) {
      result.pattern = new RegExp(`(${result.keywords.join(").*(")})`)
   }
   return result
}

export function matchComponentFilter(pub: ComponentPublication, filter?: Partial<ComponentFilter>): boolean {
   function match_text(text: string, pattern: RegExp): boolean {
      if (!pattern) {
         return true
      }
      if (text) {
         return !pattern || pattern.test(text)
      }
      return false
   }
   function match_item_in_list(target: string, expecteds: string[]): boolean {
      if (expecteds.length === 0) {
         return true
      }
      if (target && expecteds.includes(target)) {
         return true
      }
      return false
   }
   function match_list_in_list(targets: string[], expecteds: string[]): boolean {
      if (expecteds.length === 0) {
         return true
      }
      if (targets) {
         for (const target of targets) {
            if (expecteds.includes(target)) return true
         }
      }
      return false
   }
   if (!match_text(pub.title || pub.component_id, filter.pattern) && !match_text(pub.description, filter.pattern)) return false
   if (!match_list_in_list(pub.services, filter.services)) return false
   if (!match_list_in_list(pub.keywords, filter.keywords)) return false
   if (!match_list_in_list(pub.tags, filter.tags)) return false
   if (!match_item_in_list(pub.type, filter.types)) return false
   return true
}

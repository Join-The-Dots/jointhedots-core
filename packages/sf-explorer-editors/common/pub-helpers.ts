import { MapLike } from "@sf-explorer/core"
import { ComponentPublication } from "@sf-explorer/core"

export function getComponentGroupName(id: string) {
   const pos = id.lastIndexOf(":")
   if (pos < 0) return "common"
   else return id.slice(0, id.lastIndexOf(":"))
}

export function getComponentSmallName(id: string) {
   const pos = id.lastIndexOf(":")
   if (pos < 0) return id
   else return id.slice(pos + 1)
}

export function groupComponentPublications(items: ComponentPublication[]): MapLike<ComponentPublication[]> {
   const result = {}
   for (const item of items) {
      const pack = getComponentGroupName(item.component_id)
      let list = result[pack] = result[pack] || []
      list.push(item)
   }
   return result
}

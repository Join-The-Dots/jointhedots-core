import { MapLike } from "core/types/common"

export function getLocationQuery(): MapLike<string> {
   const { search } = window.location
   const query = {}
   if (search.startsWith("?")) {
      for (const param of search.slice(1).split("&")) {
         const parts = param.split('=')
         query[parts[0]] = decodeURIComponent(parts[1])
      }
   }
   return query
}

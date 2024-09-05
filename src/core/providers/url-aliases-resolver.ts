import { IUrlResolver } from "core/types/services"
import { MapLike } from "typescript"

export class AliasesUrlResolver implements IUrlResolver {
   aliases: MapLike<string> = {
      "workbench": "/builder.workbench.html",
   }
   resolve(url: URL): URL {
      if (url.protocol === "alias:") {
         const name = url.pathname.split("/")[0]
         const alias = this.aliases[name]
         if (alias) {
            const res = new URL(alias, window.location.href)
            res.pathname += url.pathname.slice(name.length)
            res.search = url.search
            res.hash = url.hash
            return res
         }
      }
      return url
   }
}

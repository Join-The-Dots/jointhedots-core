import { IconCollection, IconElement, registerIconCollection } from "../Icon"

export class IconBadgeCollection implements IconCollection {
   setup(element: IconElement) {
      const { name } = element
      element.className = `jtd-icons-avatar ${element.className}`
      element.style["--avatar-bgcolor"] = "#888"
      element.value = "" + name
   }
   draw(element: IconElement) {
      const { value, className, style } = element
      return <div className={className} style={style}>
         <div>{value}</div>
      </div>
   }
}

registerIconCollection("badge", new IconBadgeCollection())

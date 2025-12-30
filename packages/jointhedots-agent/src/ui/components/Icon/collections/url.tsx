import type { IconCollection, IconElement } from "../Icon.tsx"

export class IconUrlCollection implements IconCollection {
   constructor(readonly baseUrl: string) {
   }
   setup(element: IconElement) {
      const { name } = element
      Object.assign(element.style, styles)
      element.style.backgroundImage = `url(${this.baseUrl}${name})`
   }
   draw(element: IconElement) {
      const { className, style } = element
      return <div className={className} style={style} />
   }
}

const styles = {
   height: "1em",
   width: "1em",
   minHeight: "1em",
   minWidth: "1em",
   backgroundRepeat: "no-repeat",
   backgroundPosition: "center",
}

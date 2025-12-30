import type { IconCollection, IconElement } from "../Icon"
import { ThemeLighting, ThemeProvider } from "../../theme"

export class IconSVGInnerCollection implements IconCollection {
   public lightRef: string
   public darkRef: string
   constructor(
      readonly light_url: URL | string,
      readonly dark_url: URL | string,
      readonly classNamer?: (element: IconElement) => string,
   ) {
      this.lightRef = `${light_url}#`
      this.darkRef = `${dark_url}#`
   }
   setup(element: IconElement) {
      const { classNamer } = this
      element.className = classNamer ? classNamer(element) : element.className
      Object.assign(element.style, styles)
   }
   draw(element: IconElement, theme: ThemeProvider) {
      const { name, className, style } = element
      const baseRef = (theme.lighting === ThemeLighting.Light) ? this.lightRef : this.darkRef
      return <svg className={className} style={style}>
         <use xlinkHref={baseRef + name}></use>
      </svg>
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

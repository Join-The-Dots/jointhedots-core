import type{ IconCollection, IconElement } from "../Icon"
import { ThemeLighting, ThemeProvider } from "../../theme"

export class IconSVGCollection implements IconCollection {
   lights: { [name: string]: string } = {}
   darks: { [name: string]: string } = {}
   constructor(public defaultIcon: string) {
   }
   addIcon(name: string, light_icon: URL, dark_icon: URL) {
      this.lights[name] = `url(${light_icon})`
      this.darks[name] = `url(${dark_icon})`
   }
   setup(element: IconElement) {
      Object.assign(element.style, styles)
   }
   draw(element: IconElement, theme: ThemeProvider) {
      const { name, className, style } = element
      const icon = theme.lighting === ThemeLighting.Light
         ? this.lights[name] || this.lights[this.defaultIcon]
         : this.darks[name] || this.darks[this.defaultIcon]
      return <div className={className} style={{ backgroundImage: icon, ...style }} />
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

import React from "react"
import { IconCollection, IconProps } from "./Icon"
import { ThemeLighting, ThemeProvider } from "../theme"

export class IconSVGCollection implements IconCollection {
   lights: { [name: string]: string } = {}
   darks: { [name: string]: string } = {}
   constructor(public defaultIcon: string) {
   }
   addIcon(name: string, light_icon: URL, dark_icon: URL) {
      this.lights[name] = `url(${light_icon})`
      this.darks[name] = `url(${dark_icon})`
   }
   draw(props: IconProps, theme: ThemeProvider) {
      const { name, title, className, onClick } = props
      const icon = theme.lighting === ThemeLighting.Light
         ? this.lights[name] || this.lights[this.defaultIcon]
         : this.darks[name] || this.darks[this.defaultIcon]
      return <div
         className={className || ""}
         title={title}
         style={{ backgroundImage: icon, ...styles }}
         onClick={onClick}
      />
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

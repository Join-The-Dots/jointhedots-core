import React from "react"
import { IconCollection, IconProps } from "."
import { ThemeLighting, ThemeProvider } from "core/theme"

export class IconSVGInnerCollection implements IconCollection {
   public namePrefix: string
   public lightRef: string
   public darkRef: string
   constructor(
      name: string,
      light_url: URL | string,
      dark_url: URL | string,
   ) {
      this.namePrefix = `${name}:`
      this.lightRef = `${light_url}#`
      this.darkRef = `${dark_url}#`
   }
   draw(props: IconProps, theme: ThemeProvider) {
      const { name, title, className, onClick } = props
      const baseRef = (theme.lighting === ThemeLighting.Light) ? this.lightRef : this.darkRef
      const icon = name.replace(this.namePrefix, baseRef)
      return <svg
         aria-hidden="true"
         className={className || "slds-button__icon"}
         style={styles}
         onClick={onClick}
      >
         <use xlinkHref={icon}></use>
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

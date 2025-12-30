import React from "react"
import { IconCollection, IconElement } from "../Icon"

export class IconFontCollection implements IconCollection {
   constructor(
      public classPrefix: string,
   ) {
   }
   setup(element: IconElement) {
      const { name } = element
      element.className = `${this.classPrefix + name} ${element.className}`
      Object.assign(element.style, styles)
   }
   draw(element: IconElement) {
      const { className, style } = element
      return <i className={className} style={style} />
   }
}

const styles: React.CSSProperties = {
   height: "1em",
   width: "1em",
   display: "inline-flex",
   flexDirection: "row",
   alignItems: "center",
}

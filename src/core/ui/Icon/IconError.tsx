import React from "react"
import { IconCollection, IconProps } from "."
import { ThemeProvider } from "@livedoc/core/theme"

export class IconError implements IconCollection {
   draw(props: IconProps, theme: ThemeProvider) {
      const { name, title, className, onClick } = props
      return <div
         className={className || ""}
         title={`[Bad icon '${name}']${title || ""}`}
         style={styles}
         onClick={onClick}
      />
   }
}

const styles = {
   height: "1em",
   width: "1em",
   minHeight: "1em",
   minWidth: "1em",
   background: 'repeating-linear-gradient(45deg,#0000,#0000 1px,#f00 2px,#f00 3px)',
}

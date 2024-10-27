import React from "react"
import { IconCollection, IconProps } from "./Icon"
import { ThemeLighting, ThemeProvider } from "../../theme"

export class IconFontCollection implements IconCollection {
   constructor(
      public namePrefix: string,
      public classPrefix: string,
   ) {
   }
   draw(props: IconProps, theme: ThemeProvider) {
      const { name, title, className, onClick } = props
      return <div
         className={className || ""}
         title={title}
         style={styles}
         onClick={onClick}
      >
         <i className={name.replace(this.namePrefix, this.classPrefix)} />
      </div>
   }
}

export const styles: React.CSSProperties = {
   height: "1em",
   width: "1em",
   display: "inline-flex",
   flexDirection: "column",
   alignItems: "center",
}

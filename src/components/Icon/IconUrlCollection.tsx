import React from "react"
import { IconCollection, IconProps } from "."
import { ThemeProvider } from "components/Theme"

export class IconUrlCollection implements IconCollection {
   constructor(readonly baseUrl: string) {
   }
   draw(props: IconProps, theme: ThemeProvider) {
      const { name, title, className, onClick } = props
      return <div
         className={className || ""}
         title={title}
         style={{ backgroundImage: `url(${this.baseUrl}${name})`, ...styles }}
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

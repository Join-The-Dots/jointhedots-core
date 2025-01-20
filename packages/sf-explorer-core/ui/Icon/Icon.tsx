import React from "react"
import { IconError } from "./IconError"
import { ThemeContext, ThemeProvider } from "../../theme"
import { IconUrlCollection } from "./IconUrlCollection"

export interface IconCollection {
   draw(props: IconProps, theme: ThemeProvider): React.ReactElement
}

export type IconProps = {
   name: string
   className?: string
   style?: React.CSSProperties
   inversed?: boolean
   title?: string
   onClick?: (evt) => void
}

const collections: {
   [namespace: string]: IconCollection
} = {
   "default": new IconError()
}

export function registerIconCollection(namespace: string, collection: IconCollection) {
   collections[namespace] = collection
}

export function getIconCollection(name: string) {
   const namespace_end = typeof name === "string" ? name.indexOf(":") : -1
   if (namespace_end > 0) {
      const namespace = name.slice(0, namespace_end)
      return collections[namespace] || collections["default"]
   }
   else {
      return collections[name] || collections["default"]
   }
}

registerIconCollection("data", new IconUrlCollection(""))

export function Icon(props: {
   name: string
   className?: string
   style?: React.CSSProperties
   inversed?: boolean
   title?: string
   onClick?: (evt) => void
}) {
   const theme = React.useContext(ThemeContext)
   const collection = getIconCollection(props.name)
   return collection.draw(props, props.inversed ? theme.contrastTheme : theme)
}

const ButtonClassname = "sfe-icon-button "

export function IconButton(props: {
   name: string
   className?: string
   style?: React.CSSProperties
   inversed?: boolean
   title?: string
   onClick?: (evt) => void
}) {
   const { className } = props
   return <Icon
      {...props}
      className={className ? ButtonClassname + className : ButtonClassname}
   />
}

export default Icon

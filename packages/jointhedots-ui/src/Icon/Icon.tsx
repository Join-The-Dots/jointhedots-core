import React from "react"
import { ThemeContext, ThemeProvider } from "../theme"
import { IconUrlCollection } from "./collections/url"
import { IconBlank, IconError } from "./collections/defaults"

export interface IconStyle {
   className?: string
   style?: Record<string, string | number>
}

export interface IconElement extends IconStyle {
   collection: IconCollection
   name: string
   [key: string]: any
}

export interface IconComposed extends IconStyle {
   elements: IconElement[]
}

export interface IconCollection {
   setup(element: IconElement)
   draw(element: IconElement, theme: ThemeProvider): React.ReactElement
}

export enum IconSize {
   xs = "0.8em",
   sm = "1.0em",
   md = "1.5em",
   lg = "2.0em",
}

export type IconProps = {
   name: string
   size?: keyof typeof IconSize | string // default is 'sm'
   inverse?: boolean
   title?: string
   className?: string
   style?: React.CSSProperties
   onClick?: (evt) => void
}

export function registerIconCollection(namespace: string, collection: IconCollection) {
   IconCollections[namespace] = collection
}

export function getIconName(icon: string, name: string): string {
   if (icon) {
      return icon
   }
   else if (name) {
      return "avatar:" + name
   }
   return null
}

export function Icon(props: IconProps) {
   const { name, size, inverse: inversed, className, style } = props
   const theme = React.useContext(ThemeContext)
   const icon = getIconParsed(name)
   const iconTheme = inversed ? theme.contrastTheme : theme
   const iconLayers = []
   for (const element of icon.elements) {
      iconLayers.push(element.collection.draw(element, iconTheme))
   }
   return React.createElement("div", {
      ...props,
      name: undefined,
      inversed: undefined,
      className: (className && icon.className)
         ? `${className} ${icon.className}`
         : (className || icon.className),
      style: {
         fontSize: size && (IconSize[size] || size),
         ...style,
         ...icon.style,
      }
   }, ...iconLayers)
}

const IconCollections: { [namespace: string]: IconCollection } = {
   "blank": new IconBlank(),
   "?": new IconError(),
}

const IconParsedCache = new Map<string, IconComposed>()

const IconFlags: Record<string, IconStyle> = {
   "error": makeColorFlag("red"),
   "warn": makeColorFlag("gold"),
   "info": makeColorFlag("grey"),
   "primary": makeColorFlag("#36f"),
   "secondary": makeColorFlag("#666"),
   "success": makeColorFlag("#6d0"),
   "badge": {
      style: {
         "fontSize": "0.6em",
         "top": "-0.3em", "right": "-0.3em",
         "left": "unset", "bottom": "unset",
      }
   },
   "RT": {
      style: {
         "fontSize": "0.6em",
         "top": "-0.3em", "right": "-0.3em",
         "left": "unset", "bottom": "unset",
      }
   },
   "RB": {
      style: {
         "fontSize": "0.6em",
         "bottom": "-0.3em", "right": "-0.3em",
         "left": "unset", "top": "unset",
      }
   },
   "LT": {
      style: {
         "fontSize": "0.6em",
         "top": "-0.3em", "left": "-0.3em",
         "right": "unset", "bottom": "unset",
      }
   },
   "LB": {
      style: {
         "fontSize": "0.6em",
         "bottom": "-0.3em", "left": "-0.3em",
         "right": "unset", "top": "unset",
      }
   },
}

const IconBaseRegex = /^(?:\[(?<options>[^\]]*)\])?(?<elements>.*)$/
const IconElementRegex = /^(?:(?<set>[a-z0-9-_@]+):)?(?<name>[^\[]+)(?:\[(?<options>[^\]]*)\])?$/

registerIconCollection("data", new IconUrlCollection(""))

function makeColorFlag(color: string): IconStyle {
   return {
      style: { color, "--color": color },
   }
}

function parseIconStyle(icon: IconStyle, options: string) {
   if (options) {
      const style = icon.style || {}
      const classnames = []
      if (icon.className) {
         classnames.push(icon.className)
      }
      for (const opt of options.split(',')) {
         const [key, val] = opt.split('=')
         if (val) {
            style["--" + key] = val
         }
         else {
            const flag = IconFlags[key]
            if (flag) {
               classnames.push(flag.className)
               Object.assign(style, flag.style)
            }
            else {
               console.error(`Icon '${name}' has invalid flag '${key}'`)
            }
         }
      }
      icon.className = classnames.join(" ")
      icon.style = style
   }
}

function parseIconElement(icon: IconComposed, name: string) {
   let element: IconElement = null
   const match = name.match(IconElementRegex)
   if (match && match.groups) {
      const { set, name, options } = match.groups
      const collection = (set ? IconCollections[set] : IconCollections[name]) || IconCollections["?"]
      element = { collection, name, className: "", style: {} }
      parseIconStyle(element, options)
   }
   else {
      const collection = IconCollections["?"]
      element = { collection, name, className: "", style: {} }
      console.error(`Icon element '${name}' is invalid`)
   }
   element.collection.setup(element)
   icon.elements.push(element)
}

function parseIconStack(name: string): IconComposed {
   const icon: IconComposed = {
      elements: [],
      className: "jtd-icon"
   }
   const match = name.match(IconBaseRegex)
   if (match && match.groups) {
      const { options, elements } = match.groups
      parseIconStyle(icon, options)
      for (const element of elements.split("|")) {
         parseIconElement(icon, element)
      }
   }
   else {
      console.error(`Icon '${name}' is invalid`)
      const collection = IconCollections["?"]
      icon.elements.push({ collection, name })
   }
   return icon
}

function getIconParsed(name: string): IconComposed {
   let parsed = IconParsedCache.get(name)
   if (!parsed) {
      if (typeof name !== "string") {
         if (name === undefined) name = "blank"
         else if (name === null) name = "blank"
         else if (typeof name === "number") name = `badge:${name}`
         else name = `error:typeof ${typeof name}`
      }
      parsed = parseIconStack(name)
      IconParsedCache.set(name, parsed)
   }
   return parsed
}

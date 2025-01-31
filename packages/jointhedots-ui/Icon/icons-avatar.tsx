import React from "react"
import { IconCollection, IconProps, registerIconCollection } from "./Icon"
import "./style.scss"

export class IconAvatarCollection implements IconCollection {
   draw(props: IconProps) {
      const { name, title, className, onClick } = props
      const tag = getTag(name.slice(7))
      return <div
         className={(className || "") + " jtd-icons-avatar"}
         title={title}
         style={{ "--avatar-bgcolor": stringToRGB(name) } as any}
         onClick={onClick}
      >
         <div>{tag}</div>
      </div>
   }
}


function getTag(name: string): string {
   let tag = name.charAt(0)
   for (const x of name.matchAll(/[\-_ ]([a-zA-Z])/g)) {
      tag += x[1]
      if (tag.length >= 2) break
   }
   return tag.toUpperCase()
}

function stringToRGB(str) {
   const color = getRandomLikeNumber(str)
   return hueToRgb(color * 360)
}

function getRandomLikeNumber(str?: string, seed: number = 0) {
   if (str == undefined) {
      return Math.random()
   }
   else {
      let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
      for (let i = 0, ch; i < str.length; i++) {
         ch = str.charCodeAt(i)
         h1 = Math.imul(h1 ^ ch, 2654435761)
         h2 = Math.imul(h2 ^ ch, 1597334677)
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
      const result = 4294967296 * (2097151 & h2) + (h1 >>> 0)
      return (result & 0xffff) / 0xffff
   }
}

function hueToRgb(hue) {
   let s = 0.7 // Saturation
   let l = 0.5 // Lightness

   let c = (1 - Math.abs(2 * l - 1)) * s
   let x = c * (1 - Math.abs((hue / 60) % 2 - 1))
   let m = l - c / 2

   let r, g, b

   if (hue >= 0 && hue < 60) {
      r = c
      g = x
      b = 0
   } else if (hue >= 60 && hue < 120) {
      r = x
      g = c
      b = 0
   } else if (hue >= 120 && hue < 180) {
      r = 0
      g = c
      b = x
   } else if (hue >= 180 && hue < 240) {
      r = 0
      g = x
      b = c
   } else if (hue >= 240 && hue < 300) {
      r = x
      g = 0
      b = c
   } else if (hue >= 300 && hue < 360) {
      r = c
      g = 0
      b = x
   }

   r = Math.round((r + m) * 255)
   g = Math.round((g + m) * 255)
   b = Math.round((b + m) * 255)

   return `rgb(${r}, ${g}, ${b})`
}

registerIconCollection("avatar", new IconAvatarCollection())

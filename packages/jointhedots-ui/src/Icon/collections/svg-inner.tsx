import { IconCollection, IconElement } from "../Icon"
import { ThemeLighting, ThemeProvider } from "../../theme"

const sprites = new Map<string, string>()
let spriteId = 0

function injectSprite(url: string): string {
   let prefix = sprites.get(url)
   if (prefix != null) return prefix
   prefix = `s${spriteId++}-`
   sprites.set(url, prefix)
   fetch(url).then(r => r.text()).then(svg => {
      document.body.insertAdjacentHTML("afterbegin",
         `<div style="display:none">${svg.replace(/ id="/g, ` id="${prefix}`)}</div>`)
   })
   return prefix
}

export class IconSVGInnerCollection implements IconCollection {
   public lightPrefix: string
   public darkPrefix: string
   constructor(
      readonly light_url: URL | string,
      readonly dark_url: URL | string,
      readonly classNamer?: (element: IconElement) => string,
   ) {
      this.lightPrefix = injectSprite(`${light_url}`)
      this.darkPrefix = injectSprite(`${dark_url}`)
   }
   setup(element: IconElement) {
      const { classNamer } = this
      element.className = classNamer ? classNamer(element) : element.className
      Object.assign(element.style, styles)
   }
   draw(element: IconElement, theme: ThemeProvider) {
      const { name, className, style } = element
      const prefix = (theme.lighting === ThemeLighting.Light) ? this.lightPrefix : this.darkPrefix
      return <svg className={className} style={style}>
         <use xlinkHref={`#${prefix}${name}`}></use>
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

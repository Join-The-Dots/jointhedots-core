import type{ IconCollection, IconElement } from "../Icon"

export class IconError implements IconCollection {
   setup(element: IconElement) {
      Object.assign(element.style, error_styles)
   }
   draw(element: IconElement) {
      const { name, className, style } = element
      const title = `[Bad icon '${name}']`
      return <div title={title} className={className} style={style} />
   }
}

export class IconBlank implements IconCollection {
   setup(element: IconElement) {
   }
   draw(element: IconElement) {
      const { className, style } = element
      return <div className={className} style={style} />
   }
}

const error_styles = {
   height: "1em",
   width: "1em",
   background: 'repeating-linear-gradient(45deg,#0000,#0000 1px,#f00 2px,#f00 3px)',
}


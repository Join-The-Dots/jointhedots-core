import React from "react"
import ReactDOM from 'react-dom/client'
import { IconFontCollection, IconSVGInnerCollection, registerIconCollection } from "@jointhedots/ui/Icon"
import utility_symbols_svg from "@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg"
import standard_symbols_svg from "@salesforce-ux/design-system/assets/icons/standard-sprite/svg/symbols.svg"
import "bootstrap-icons/font/bootstrap-icons.css"
import "font-awesome/css/font-awesome.min.css"
import { registerMissingServiceDisplayer } from "@jointhedots/ui/ServicePoint"

registerIconCollection("bi", new IconFontCollection("bi bi-"))
registerIconCollection("fa", new IconFontCollection("fa fa-"))

registerIconCollection("utility", new IconSVGInnerCollection(utility_symbols_svg, utility_symbols_svg))
registerIconCollection("sf-standard", new IconSVGInnerCollection(standard_symbols_svg, standard_symbols_svg))
registerIconCollection("standard", new IconSVGInnerCollection(standard_symbols_svg, standard_symbols_svg))

registerMissingServiceDisplayer()

export function renderRoot(content: React.ReactNode) {
   const root = window.document.createElement("div")
   root.id = "root"
   window.document.body.appendChild(root)
   ReactDOM.createRoot(root).render(content)
}

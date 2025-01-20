import { IconFontCollection } from "@sf-explorer/core/ui/Icon/IconFontCollection"
import { registerIconCollection } from "@sf-explorer/core/ui/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"

const icons = new IconFontCollection("bi:", "bi bi-")
registerIconCollection("bi", icons)

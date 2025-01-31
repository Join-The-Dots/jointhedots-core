import { IconFontCollection } from "@jointhedots/ui/Icon/IconFontCollection"
import { registerIconCollection } from "@jointhedots/ui/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"

const icons = new IconFontCollection("bi:", "bi bi-")
registerIconCollection("bi", icons)

import { IconFontCollection } from "@jointhedots/ui/Icon/collections/font"
import { registerIconCollection } from "@jointhedots/ui/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"

const icons = new IconFontCollection("bi bi-")
registerIconCollection("bi", icons)

import { IconFontCollection } from "core/ui/Icon/IconFontCollection"
import { registerIconCollection } from "core/ui/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"

const icons = new IconFontCollection("bi:", "bi bi-")
registerIconCollection("bi", icons)

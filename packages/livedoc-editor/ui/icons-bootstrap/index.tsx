import { IconFontCollection } from "@livedoc/ui/Icon/IconFontCollection"
import { registerIconCollection } from "@livedoc/ui/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"

const icons = new IconFontCollection("bi:", "bi bi-")
registerIconCollection("bi", icons)

import { IconFontCollection } from "@livedoc/core/ui/Icon/IconFontCollection"
import { registerIconCollection } from "@livedoc/core/ui/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"

const icons = new IconFontCollection("bi:", "bi bi-")
registerIconCollection("bi", icons)

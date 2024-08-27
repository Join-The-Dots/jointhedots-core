import { IconFontCollection } from "components/Icon/IconFontCollection"
import { registerIconCollection } from "components/Icon"
import "bootstrap-icons/font/bootstrap-icons.css"

const icons = new IconFontCollection("bi:", "bi bi-")
registerIconCollection("bi", icons)

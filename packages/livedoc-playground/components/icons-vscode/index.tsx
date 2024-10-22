import { IconSVGCollection } from "@livedoc/core/ui/Icon/IconSVGCollection"
import { registerIconCollection } from "@livedoc/core/ui/Icon"
import getDarkIcons from "./icons-dark"
import getLightIcons from "./icons-light"

const namespace = "code"
const dark_icons = getDarkIcons()
const light_icons = getLightIcons()
const icons = new IconSVGCollection("")
for (const name in dark_icons) {
   icons.addIcon(namespace + ":" + name, light_icons[name], dark_icons[name])
}
registerIconCollection("code", icons)

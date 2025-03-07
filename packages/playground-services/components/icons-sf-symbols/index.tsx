import { IconSVGInnerCollection, registerIconCollection } from "@jointhedots/ui/Icon"
import utility_symbols_svg from "@salesforce-ux/design-system/assets/icons/utility-sprite/svg/symbols.svg"
import standard_symbols_svg from "@salesforce-ux/design-system/assets/icons/standard-sprite/svg/symbols.svg"

registerIconCollection("utility", new IconSVGInnerCollection("utility", utility_symbols_svg, utility_symbols_svg))
registerIconCollection("sf-standard", new IconSVGInnerCollection("sf-standard", standard_symbols_svg, standard_symbols_svg))
registerIconCollection("standard", new IconSVGInnerCollection("standard", standard_symbols_svg, standard_symbols_svg))

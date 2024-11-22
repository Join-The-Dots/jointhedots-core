import { ASTGenerator, Element, ElementClass, JSONSchema, stringify_node_jsx } from "@sf-explorer/core"
import { EditionDriver, EditorValueMatch } from "./interfaces"

export class ElementDriverProvider {
   drivers = new Map<ElementClass, EditionDriver>()
   defaultController: EditionDriver = null

   registerController<T extends Element>(driver: EditionDriver<T>, isDefault?: boolean) {
      if (!driver.matchType) driver.matchType = () => EditorValueMatch.None
      if (isDefault === true) this.defaultController = driver
      this.drivers.set(driver.cls, driver)
   }

   findControllerOf<T extends Element>(value: T): EditionDriver<T> {
      const driver = this.drivers.get(value?.constructor as any) || this.defaultController
      return driver as EditionDriver<T>
   }

   async listControllerOf<T extends Element>(value: T, typing: JSONSchema): Promise<Map<EditionDriver<T>, EditorValueMatch>> {
      const matchings = new Map<EditionDriver<T>, EditorValueMatch>()
      if (typing) {
         for (const driver of this.drivers.values()) {
            const lvl = driver.matchType(typing)
            if (lvl > EditorValueMatch.None) {
               matchings.set(driver as EditionDriver<T>, lvl)
            }
         }
      }
      if (value !== undefined) {
         const driver = this.findControllerOf(value)
         if (driver) matchings.set(driver, EditorValueMatch.Best)
      }
      return matchings
   }
   stringify(value: any) {
      const ctx = new ASTGenerator()
      const ast = ctx.generate(null, value)
      return {
         lang: 'javascript',
         text: stringify_node_jsx(ast),
      }
   }
}

export const ElementsEditors = new ElementDriverProvider() 

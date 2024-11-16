import { ASTGenerator, Element, JSONSchema, stringify_node_jsx } from "@sf-explorer/core"
import { EditionDriver, EditorValueMatch } from "./interfaces"

export class ElementDriverProvider {
   controllers: EditionDriver[] = []
   defaultController: EditionDriver = null

   registerController<T extends Element>(ctl: EditionDriver<T>, isDefault?: boolean) {
      if (!ctl.matchType) ctl.matchType = () => EditorValueMatch.None
      if (!ctl.matchValue) ctl.matchValue = (value: T) => {
         if (value instanceof ctl.cls) {
            if (value.constructor === ctl.cls) return EditorValueMatch.Best
            return EditorValueMatch.Valid
         }
         return EditorValueMatch.None
      }
      if (isDefault === true) this.defaultController = ctl
      this.controllers.push(ctl)
   }

   async findControllerOf<T extends Element>(value: T, typing: JSONSchema): Promise<EditionDriver<T>> {
      let best_level = EditorValueMatch.None
      let best_match = this.defaultController
      for (const ctl of this.controllers) {
         const lvl = ctl.matchValue(value)
         if (lvl > best_level) {
            best_level = lvl
            best_match = ctl
         }
      }
      return best_match as EditionDriver<T>
   }

   async listControllerOf<T extends Element>(value: T, typing: JSONSchema): Promise<Map<EditionDriver<T>, EditorValueMatch>> {
      const matchings = new Map<EditionDriver<T>, EditorValueMatch>()
      if (typing) {
         for (const ctl of this.controllers) {
            const lvl = ctl.matchType(typing)
            if (lvl > EditorValueMatch.None) {
               matchings.set(ctl as EditionDriver<T>, lvl)
            }
         }
      }
      if (value !== undefined) {
         for (const ctl of this.controllers) {
            const lvl = ctl.matchValue(value)
            if (lvl > EditorValueMatch.None) {
               matchings.set(ctl as EditionDriver<T>, lvl)
            }
         }
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

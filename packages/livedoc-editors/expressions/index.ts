import { JSONSchema } from "@livedoc/core/ast/schema"
import { EditionController, EditorValueMatch, IEditorProvider } from "@livedoc/editors/ui"
import * as AST from "@livedoc/core/ast/nodes"

export class DataEditorProvider implements IEditorProvider {
   controllers: EditionController[] = []
   defaultController: EditionController = null

   registerController(ctl: EditionController, isDefault?: boolean) {
      if (!ctl.matchType) ctl.matchType = () => EditorValueMatch.None
      if (!ctl.matchValue) ctl.matchValue = () => EditorValueMatch.None
      if (isDefault === true) this.defaultController = ctl
      this.controllers.push(ctl)
   }

   async findControllerOf(value: any, typing: JSONSchema): Promise<EditionController> {
      let best_level = EditorValueMatch.None
      let best_match = this.defaultController as EditionController
      for (const ctl of this.controllers) {
         const lvl = ctl.matchType(typing)
         if (lvl > best_level) {
            best_level = lvl
            best_match = ctl
         }
      }
      return best_match
   }

   async listControllerOf(value: any, typing: JSONSchema): Promise<Map<EditionController, EditorValueMatch>> {
      const matchings = new Map<EditionController, EditorValueMatch>()
      if (typing) {
         for (const ctl of this.controllers) {
            const lvl = ctl.matchType(typing)
            if (lvl > EditorValueMatch.None) {
               matchings.set(ctl, lvl)
            }
         }
      }
      if (value !== undefined) {
         for (const ctl of this.controllers) {
            const lvl = ctl.matchValue(value)
            if (lvl > EditorValueMatch.None) {
               matchings.set(ctl, lvl)
            }
         }
      }
      return matchings
   }
}

export const ExpressionsEditors = new DataEditorProvider()

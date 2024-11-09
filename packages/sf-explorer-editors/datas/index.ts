import { JSONSchema } from "@sf-explorer/core"
import { MapLike } from "@sf-explorer/core"
import { EditionController, EditorValueMatch, IEditorProvider } from "@sf-explorer/editors/ui/editor-context"

export type DataEditionController = EditionController & {
   name: string
   kind?: string
}

export class DataEditorProvider implements IEditorProvider {
   controllers: DataEditionController[] = []
   defaultController: DataEditionController = null

   registerController(ctl: DataEditionController, isDefault?: boolean) {
      if (!ctl.matchType) ctl.matchType = () => EditorValueMatch.None
      if (!ctl.matchValue) ctl.matchValue = () => EditorValueMatch.None
      if (isDefault === true) this.defaultController = ctl
      this.controllers.push(ctl)
   }

   async findControllerOf(value: any, typing: JSONSchema): Promise<DataEditionController> {
      let best_level = EditorValueMatch.None
      let best_match = this.defaultController as DataEditionController
      for (const ctl of this.controllers) {
         const lvl = ctl.matchType(typing)
         if (lvl > best_level) {
            best_level = lvl
            best_match = ctl
         }
      }
      return best_match
   }

   async listControllerOf(value: any, typing: JSONSchema): Promise<Map<DataEditionController, EditorValueMatch>> {
      const matchings = new Map<DataEditionController, EditorValueMatch>()
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

export const DataEditors = new DataEditorProvider()

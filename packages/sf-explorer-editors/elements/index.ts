import { JSONSchema } from "@sf-explorer/core"
import { EditionDriver, EditorValueMatch, IEditorProvider } from "@sf-explorer/editors/ui/editor-context"
import * as AST from "@sf-explorer/core"

export interface ElementEditor<T extends AST.Expr> extends EditionDriver<T> {
   cls: AST.ExprClass<T>
}

export class ElementEditorProvider implements IEditorProvider<AST.Expr> {
   controllers: EditionDriver[] = []
   defaultController: EditionDriver = null

   registerController<T extends AST.Expr>(ctl: ElementEditor<T>, isDefault?: boolean) {
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

   async findControllerOf<T extends AST.Expr>(value: T, typing: JSONSchema): Promise<EditionDriver<T>> {
      let best_level = EditorValueMatch.None
      let best_match = this.defaultController as EditionDriver
      for (const ctl of this.controllers) {
         const lvl = ctl.matchValue(value)
         if (lvl > best_level) {
            best_level = lvl
            best_match = ctl
         }
      }
      if (best_level === EditorValueMatch.None) {
         for (const ctl of this.controllers) {
            const lvl = ctl.matchType(typing)
            if (lvl > best_level) {
               best_level = lvl
               best_match = ctl
            }
         }
      }
      return best_match
   }

   async listControllerOf<T extends AST.Expr>(value: T, typing: JSONSchema): Promise<Map<EditionDriver<T>, EditorValueMatch>> {
      const matchings = new Map<EditionDriver, EditorValueMatch>()
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
   stringify(value: any) {
      const ctx = new AST.SubTreeGenerator()
      const ast = ctx.generateXpr(null, value)
      return {
         lang: 'mdx',
         text: AST.stringify_node_jsx(ast),
      }
   }
}

export const ElementsEditors = new ElementEditorProvider()

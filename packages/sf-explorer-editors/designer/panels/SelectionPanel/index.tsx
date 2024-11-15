import React from 'react'
import { ViewEditor } from '../../editor'
import { EditionContext } from '@sf-explorer/editors/ui/editor-context'
import ValuePanel from '@sf-explorer/editors/ui/ValuePanel'
import { ElementsEditors } from '@sf-explorer/editors/elements'
import { PanelComponent, PanelDescriptor } from '@sf-explorer/editors/ui/FeaturesLayout'
import { ElementEditionSelection, ModelEditionSession } from '../../EditionSession'
import { Expr } from '@sf-explorer/core/index'

export class SelectionPanel extends PanelComponent<ViewEditor> {
   static descriptor: PanelDescriptor = {
      layouting: "fitted", 
      defaultTitle: "Editor",
      defaultIcon: "fa:pencil",
      defaultDockId: "right",
      parameters: {
         session: true,
         selection: true,
      }
   }
   props: {
      session: ModelEditionSession
      selection: ElementEditionSelection
   }
   get model() {
      return this.props.session.model
   }
   onElementChange = (value: Expr) => {
      const { selection } = this.props
      //selection.changeElement(value)
   }
   select(descriptor: Expr, focused: boolean) {
      this.feature.select(new ElementEditionSelection(descriptor, this.feature.session), focused)
   }
   render() {
      const { selection } = this.props
      if (selection) {
         return (<EditionContext.Provider value={selection}>
            <ValuePanel
               name={selection.getName()}
               value={selection.element}
               typing={selection.getTyping()}
               provider={ElementsEditors}
               onChange={this.onElementChange}
            />
         </EditionContext.Provider>)
      }
      else {
         return "Select something"
      }
   }
}

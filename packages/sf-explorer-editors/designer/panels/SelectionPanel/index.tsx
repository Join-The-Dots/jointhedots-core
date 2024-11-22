import React from 'react'
import { ViewEditor } from '../../editor'
import { EditionContext } from '../../../elements/interfaces'
import ValuePanel from '@sf-explorer/editors/ui/ValuePanel'
import { PanelComponent, PanelDescriptor } from '@sf-explorer/editors/ui/FeaturesLayout'
import { ElementEditionSelection, ModelEditionSession } from '../../EditionSession'
import { Element, ElementJSON } from '@sf-explorer/core'

export class SelectionPanel extends PanelComponent<ViewEditor, {
   session: ModelEditionSession
   selection: ElementEditionSelection
}> {
   static descriptor: PanelDescriptor = {
      layouting: "fitted",
      defaultTitle: "Selection",
      defaultIcon: "bi:fullscreen",
      defaultDockId: "right",
      parameters: {
         session: true,
         selection: true,
      }
   }
   get model() {
      return this.props.session.model
   }
   onElementChange = (data: ElementJSON) => {
      /* const { selection } = this.props
      cset.updates[selection.element.$key] = node
      selection.element.model.commit(cset) */
   }
   select(descriptor: Element, focused: boolean) {
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
               onChange={this.onElementChange}
            />
         </EditionContext.Provider>)
      }
      else {
         return <div>
            <div className="CommentPlugin_CommentsPanel_Empty">No Selection</div>
         </div>
      }
   }
}

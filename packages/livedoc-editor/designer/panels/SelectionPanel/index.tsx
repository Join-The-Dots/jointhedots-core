import React from 'react'
import { PanelComponent, PanelDescriptor } from '@livedoc/editor/ui/FeaturesLayout'
import { ViewEditor } from '../../editor'
import { DescriptorEditionSelection } from '../../selection'
import { DocumentModel, DXElement, ElementJSON } from '@livedoc/core'
import { EditionContext } from '@livedoc/editor/elements/interfaces'
import ElementPanel from '@livedoc/editor/elements/ui/ElementPanel'

export class SelectionPanel extends PanelComponent<ViewEditor, {
   model: DocumentModel
   selection: DescriptorEditionSelection
}> {
   static Descriptor: PanelDescriptor = {
      layouting: "fitted",
      defaultTitle: "Editor",
      defaultIcon: "fa:pencil",
      defaultDockId: "right",
      parameters: {
         session: true,
         selection: true,
      }
   }
   get model() {
      return this.props.model
   }
   onElementChange = (value: ElementJSON) => {
      const { selection } = this.props
      //selection.changeDescriptor(value)
      throw new Error("TODO")
   }
   onlementClose = () => {
      this.closePanel()
   }
   select(target: DXElement, focused: boolean) {
      this.feature.selectByElement(target, focused)
   }
   render() {
      const { selection } = this.props
      if (selection) {
         return (<EditionContext.Provider value={selection}>
            <ElementPanel
               name={selection.getName()}
               value={selection.getElement()}
               typing={selection.getTyping()}
               onChange={this.onElementChange}
               onClose={this.onlementClose}
            />
         </EditionContext.Provider>)
      }
      else {
         return "Select something"
      }
   }
}

import { ViewEditor } from '../../editor'
import { PanelComponent, PanelDescriptor } from '@sf-explorer/editors/ui/FeaturesLayout'
import ToolbarPlugin from '@sf-explorer/editors/designer/editor/ToolbarPanel'

export class ToolbarPanel extends PanelComponent<ViewEditor> {
  static descriptor: PanelDescriptor = {
    layouting: "flexible",
    defaultTitle: "Toolbar",
    defaultIcon: "bi:tools",
    defaultDockId: "toolbar",
  }
  render() {
    return <ToolbarPlugin setIsLinkEditMode={() => { }} />
  }
}

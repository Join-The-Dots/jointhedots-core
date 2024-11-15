import { ViewEditor } from '../../editor'
import { PanelComponent, PanelDescriptor } from '@sf-explorer/editors/ui/FeaturesLayout'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TreeView } from '@lexical/react/LexicalTreeView';

function TreeViewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    <TreeView
      viewClassName="editor-panel tree-view-output"
      treeTypeButtonClassName="debug-treetype-button"
      timeTravelPanelClassName="debug-timetravel-panel"
      timeTravelButtonClassName="debug-timetravel-button"
      timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
      timeTravelPanelButtonClassName="debug-timetravel-panel-button"
      editor={editor}
    />
  );
}

export class TreeViewPanel extends PanelComponent<ViewEditor> {
  static descriptor: PanelDescriptor = {
    layouting: "flexible",
    defaultTitle: "Tree",
    defaultIcon: "bi:diagram-2-fill",
    defaultDockId: "right",
  }
  render() {
    return <TreeViewPlugin />
  }
}

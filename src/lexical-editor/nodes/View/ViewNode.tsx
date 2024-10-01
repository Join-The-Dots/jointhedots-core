
import type {
   EditorConfig,
   NodeKey,
   SerializedLexicalNode,
   Spread,
} from 'lexical';

import { DecoratorNode, DOMExportOutput } from 'lexical';
import * as React from 'react';
import { Suspense } from 'react';
import { MapLike } from 'core/common';
import { ComponentsRegistry } from 'core/components';

export type SerializedViewNode = Spread<
   {
      type: "element"
      view: string
      props: MapLike<any>
   },
   SerializedLexicalNode
>;

export class ViewNode extends DecoratorNode<JSX.Element> {
   view: React.ComponentType = null

   static getType(): string {
      return 'equation';
   }

   static clone(node: ViewNode): ViewNode {
      return new ViewNode(node.data, node.__key);
   }

   constructor(public data: SerializedViewNode, key?: NodeKey) {
      super(key);
      this.view = React.lazy(() => {
         const component = ComponentsRegistry.acquireComponent(data.view)
         return component.fetchResource("view.react")
      })
   }

   static importJSON(serializedNode: SerializedViewNode): ViewNode {
      const node = new ViewNode(serializedNode);
      return node;
   }

   exportJSON(): SerializedViewNode {
      return this.data
   }

   createDOM(_config: EditorConfig): HTMLElement {
      const element = document.createElement(this.isInline() ? 'span' : 'div');
      return element;
   }

   exportDOM(): DOMExportOutput {
      const element = document.createElement(this.isInline() ? 'span' : 'div');
      return { element };
   }

   updateDOM(prevNode: ViewNode): boolean {
      // If the inline property changes, replace the element
      return this.view !== prevNode.view;
   }

   decorate(): JSX.Element {
      const { props } = this.data
      return (
         <Suspense fallback={null}>
            {this.view && <this.view {...props} />}
         </Suspense>
      );
   }
}

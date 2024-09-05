import Prism from 'prismjs'
import 'prismjs/components/prism-markdown'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Slate, Editable, withReact } from 'slate-react'
import { Text, createEditor, Descendant, Editor, Node, Point, Transforms } from 'slate'
import { withHistory } from 'slate-history'
import { css } from '@emotion/css'
import { AstMarkdown } from './markdown-serial'
import { ComponentsRegistry } from 'core/components/registry'
import { IExpressionResource } from 'core/components/interfaces'

const empty_children = [{ text: '' }]

class Expression {
   eval() {
      return null
   }
}

async function transformExprToValue(root: AstMarkdown): Promise<Node[]> {
   const chunks = []
   if (Array.isArray(root?.blocks)) {
      for (const blk of root.blocks) {
         if (typeof blk === "string") {
            chunks.push({
               type: 'paragraph',
               children: [{ text: blk }],
            })
         }
         else {
            const handler = await ComponentsRegistry.resolveResource(blk.type, "expression").fetch<IExpressionResource>()
            console.log(handler)
            if (handler) {
               const xpr = await handler.create(blk)
               chunks.push({
                  type: "embed",
                  children: empty_children,
                  expression: xpr,
               })
            }
            else {
               chunks.push({
                  type: 'paragraph',
                  children: [{ text: blk }],
               })
            }
         }
      }
   }
   console.log("Slate", chunks)
   return chunks
}

async function applyNodes(editor: Editor, root: AstMarkdown) {
   const chunks = await transformExprToValue(root)
   try {
      resetNodes(editor, { nodes: chunks })
   }
   catch (e) {
   }
}

export function MarkdownPreviewExample(props: {
   root: AstMarkdown
}) {
   const { root } = props

   const renderElement = useCallback(props => <Element {...props} />, [])
   const renderLeaf = useCallback(props => <Leaf {...props} />, [])
   const editor = useMemo(() => withHistory(withReact(createEditor())), [])

   const decorate = useCallback(([node, path]) => {
      const ranges = []

      if (!Text.isText(node)) {
         return ranges
      }

      const getLength = token => {
         if (typeof token === 'string') {
            return token.length
         } else if (typeof token.content === 'string') {
            return token.content.length
         } else {
            return token.content.reduce((l, t) => l + getLength(t), 0)
         }
      }

      const tokens = Prism.tokenize(node.text, Prism.languages.markdown)
      let start = 0

      for (const token of tokens) {
         const length = getLength(token)
         const end = start + length

         if (typeof token !== 'string') {
            ranges.push({
               [token.type]: true,
               anchor: { path, offset: start },
               focus: { path, offset: end },
            })
         }

         start = end
      }

      return ranges
   }, [])

   useEffect(() => {
      applyNodes(editor, root)
   }, [root])

   return (<Slate editor={editor} initialValue={[]}>
      <Editable
         decorate={decorate}
         renderElement={renderElement}
         renderLeaf={renderLeaf}
         placeholder="Write some markdown..."
      />
   </Slate>)
}

/**
* resetNodes resets the value of the editor.
* It should be noted that passing the `at` parameter may cause a "Cannot resolve a DOM point from Slate point" error.
*/
function resetNodes<T extends Node>(
   editor: Editor,
   options: {
      nodes?: Node | Node[],
      at?: Location
   } = {}
): void {
   const children = [...editor.children]

   children.forEach((node) => editor.apply({ type: 'remove_node', path: [0], node }))

   if (options.nodes) {
      const nodes = Node.isNode(options.nodes) ? [options.nodes] : options.nodes

      nodes.forEach((node, i) => editor.apply({ type: 'insert_node', path: [i], node: node }))
   }

   const point = options.at && Point.isPoint(options.at)
      ? options.at
      : Editor.end(editor, [])

   if (point) {
      Transforms.select(editor, point)
   }
}

const Element = ({ attributes, children, element }) => {
   switch (element.type) {
      case 'embed':
         return element.expression.eval(null)
      case 'table':
         return (
            <table>
               <tbody {...attributes}>{children}</tbody>
            </table>
         )
      case 'table-row':
         return <tr {...attributes}>{children}</tr>
      case 'table-cell':
         return <td {...attributes}>{children}</td>
      default:
         return <p {...attributes}>{children}</p>
   }
}

const Leaf = ({ attributes, children, leaf }) => {
   return (
      <span
         {...attributes}
         className={css`
        font-weight: ${leaf.bold && 'bold'};
        font-style: ${leaf.italic && 'italic'};
        text-decoration: ${leaf.underlined && 'underline'};
        ${leaf.title &&
            css`
          display: inline-block;
          font-weight: bold;
          font-size: 20px;
          margin: 20px 0 10px 0;
        `}
        ${leaf.list &&
            css`
          padding-left: 10px;
          font-size: 20px;
          line-height: 10px;
        `}
        ${leaf.hr &&
            css`
          display: block;
          text-align: center;
          border-bottom: 2px solid #ddd;
        `}
        ${leaf.blockquote &&
            css`
          display: inline-block;
          border-left: 2px solid #ddd;
          padding-left: 10px;
          color: #aaa;
          font-style: italic;
        `}
        ${leaf.code &&
            css`
          font-family: monospace;
          background-color: #eee;
          padding: 3px;
        `}
      `}
      >
         {children}
      </span>
   )
}

const initialValue: any[] = [
   {
      type: 'paragraph',
      children: [
         {
            text: 'Slate is flexible enough to add **decorations** that can format text based on its content. For example, this editor has **Markdown** preview decorations on it, to make it _dead_ simple to make an editor with built-in Markdown previewing.',
         },
      ],
   },
   {
      type: 'paragraph',
      children: [{ text: '## Try it out!' }],
   },
   {
      type: 'paragraph',
      children: [{ text: 'Try it out for yourself!' }],
   }, {
      type: 'paragraph',
      children: [
         {
            text: 'Since the editor is based on a recursive tree model, similar to an HTML document, you can create complex nested structures, like tables:',
         },
      ],
   },
   {
      type: 'table',
      children: [
         {
            type: 'table-row',
            children: [
               {
                  type: 'table-cell',
                  children: [{ text: '' }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: 'Human', bold: true }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: 'Dog', bold: true }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: 'Cat', bold: true }],
               },
            ],
         },
         {
            type: 'table-row',
            children: [
               {
                  type: 'table-cell',
                  children: [{ text: '# of Feet', bold: true }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: '2' }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: '4' }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: '4' }],
               },
            ],
         },
         {
            type: 'table-row',
            children: [
               {
                  type: 'table-cell',
                  children: [{ text: '# of Lives', bold: true }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: '1' }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: '1' }],
               },
               {
                  type: 'table-cell',
                  children: [{ text: '9' }],
               },
            ],
         },
      ],
   },
   {
      type: 'paragraph',
      children: [
         {
            text: "This table is just a basic example of rendering a table, and it doesn't have fancy functionality. But you could augment it to add support for navigating with arrow keys, displaying table headers, adding column and rows, or even formulas if you wanted to get really crazy!",
         },
      ],
   },
]


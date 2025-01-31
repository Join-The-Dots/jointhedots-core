import { $createCodeNode } from '@lexical/code';
import { INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND } from '@lexical/list';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode, $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { ComponentPublication, IComponentProvider, MapLike, ComponentsRegistry } from '@jointhedots/core';
import { InMemComponentProvider, InMemComponentPublisher } from '@jointhedots/core/library/providers/InMemComponentProvider'
import { CombinedComponentProvider } from '@jointhedots/core/library/providers/CombinedComponentProvider'

type TextualComponentEntry = Partial<ComponentPublication> & {
   onSelect: (editor) => void
}

const TextualComponentEntries: TextualComponentEntry[] = [
   {
      title: 'Paragraph',
      icon: "bi:paragraph",
      keywords: ['normal', 'paragraph', 'p', 'text'],
      onSelect: (editor) =>
         editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
               $setBlocksType(selection, () => $createParagraphNode());
            }
         }),
   },
   ...([1, 2, 3]).map((n) => ({
      title: `Heading ${n}`,
      icon: `bi:type-h${n}`,
      keywords: ['heading', 'header', `h${n}`],
      onSelect: (editor) =>
         editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
               $setBlocksType(selection, () => $createHeadingNode(`h${n}` as any));
            }
         }),
   })),
   {
      title: 'Numbered List',
      icon: "bi:list-ol",
      keywords: ['numbered list', 'ordered list', 'ol'],
      onSelect: (editor) =>
         editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
   },
   {
      title: 'Bulleted List',
      icon: "bi:list-ul",
      keywords: ['bulleted list', 'unordered list', 'ul'],
      onSelect: (editor) =>
         editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
   },
   {
      title: 'Check List',
      icon: "bi:list-check",
      keywords: ['check list', 'todo list'],
      onSelect: (editor) =>
         editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
   },
   {
      title: 'Quote',
      icon: "bi:quote",
      keywords: ['block quote'],
      onSelect: (editor) =>
         editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
               $setBlocksType(selection, () => $createQuoteNode());
            }
         }),
   },
   {
      title: 'Code',
      icon: "bi:code",
      keywords: ['javascript', 'python', 'js', 'codeblock'],
      onSelect: (editor) =>
         editor.update(() => {
            const selection = $getSelection();

            if ($isRangeSelection(selection)) {
               if (selection.isCollapsed()) {
                  $setBlocksType(selection, () => $createCodeNode());
               } else {
                  // Will this ever happen?
                  const textContent = selection.getTextContent();
                  const codeNode = $createCodeNode();
                  selection.insertNodes([codeNode]);
                  selection.insertRawText(textContent);
               }
            }
         }),
   },
   {
      title: 'Divider',
      icon: "bi:hr",
      keywords: ['horizontal rule', 'divider', 'hr'],
      onSelect: (editor) =>
         editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
   },
   ...([
      { alignment: 'left', icon: "bi:text-left" },
      { alignment: 'center', icon: "bi:text-center" },
      { alignment: 'right', icon: "bi:text-right" },
      { alignment: 'justify', icon: "bi:justify" }
   ]).map(
      ({ alignment, icon }) => ({
         title: `Align ${alignment}`,
         icon: icon,
         keywords: ['align', 'justify', alignment],
         onSelect: (editor) =>
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
      }),
   ),
]

function getComponentId(title: string): string {
   return "text:" + title.toLowerCase()
}

export const TextualComponentProvider = new InMemComponentProvider(TextualComponentEntries.map(entry => ({
   component_id: getComponentId(entry.title),
   title: entry.title,
   icon: entry.icon,
   keywords: entry.keywords,
})))

export const TextualComponentSelect: MapLike<(editor) => void> = TextualComponentEntries.reduce((catalog, entry) => {
   catalog[getComponentId(entry.title)] = entry.onSelect
   return catalog
}, {})

export function getLexicalComponentsProvider(): IComponentProvider {
   return new CombinedComponentProvider([ComponentsRegistry.components_provider, TextualComponentProvider])
}
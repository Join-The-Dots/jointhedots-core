/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { Klass, LexicalNode } from 'lexical'

import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { HashtagNode } from '@lexical/hashtag'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { MarkNode } from '@lexical/mark'
import { OverflowNode } from '@lexical/overflow'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from './Table/TableNode'

import { CollapsibleContainerNode } from './Collapsible/CollapsibleContainerNode'
import { CollapsibleContentNode } from './Collapsible/CollapsibleContentNode'
import { CollapsibleTitleNode } from './Collapsible/CollapsibleTitleNode'
import { AutocompleteNode } from './Autocomplete/AutocompleteNode'
import { EmojiNode } from './Emojis/EmojiNode'
import { ImageNode } from './Images/ImageNode'
import { InlineImageNode } from './InlineImage/InlineImageNode'
import { KeywordNode } from './Keywords/KeywordNode'
import { LayoutContainerNode } from './ColumnsLayout/LayoutContainerNode'
import { LayoutItemNode } from './ColumnsLayout/LayoutItemNode'
import { MentionNode } from './Mentions/MentionNode'
import { StickyNode } from './Sticky/StickyNode'
import { ComponentNode } from './Component/ComponentNode'
import { HorizontalRuleNode } from './HorizontalRule/HorizontalRuleNode'

const PlaygroundNodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HashtagNode,
  CodeHighlightNode,
  AutoLinkNode,
  LinkNode,
  OverflowNode,
  StickyNode,
  ImageNode,
  InlineImageNode,
  MentionNode,
  EmojiNode,
  AutocompleteNode,
  KeywordNode,
  HorizontalRuleNode,
  MarkNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
  LayoutContainerNode,
  LayoutItemNode,
  ComponentNode,
]

export default PlaygroundNodes

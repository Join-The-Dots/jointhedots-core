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
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'

import { CollapsibleContainerNode } from './Collapsible/CollapsibleContainerNode'
import { CollapsibleContentNode } from './Collapsible/CollapsibleContentNode'
import { CollapsibleTitleNode } from './Collapsible/CollapsibleTitleNode'
import { AutocompleteNode } from './Autocomplete/AutocompleteNode'
import { EmojiNode } from './Emojis/EmojiNode'
import { EquationNode } from './Equations/EquationNode'
import { ExcalidrawNode } from './Excalidraw/ExcalidrawNode'
import { FigmaNode } from './Figma/FigmaNode'
import { ImageNode } from './Images/ImageNode'
import { InlineImageNode } from '../nodes/InlineImage/InlineImageNode'
import { KeywordNode } from './Keywords/KeywordNode'
import { LayoutContainerNode } from './Layout/LayoutContainerNode'
import { LayoutItemNode } from './Layout/LayoutItemNode'
import { MentionNode } from './Mentions/MentionNode'
import { PageBreakNode } from './PageBreak/PageBreakNode'
import { PollNode } from './Poll/PollNode'
import { StickyNode } from './Sticky/StickyNode'
import { TweetNode } from './Twitter/TweetNode'
import { YouTubeNode } from './YouTube/YouTubeNode'
import { ComponentNode } from './Component/ComponentNode'

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
  PollNode,
  StickyNode,
  ImageNode,
  InlineImageNode,
  MentionNode,
  EmojiNode,
  ExcalidrawNode,
  EquationNode,
  AutocompleteNode,
  KeywordNode,
  HorizontalRuleNode,
  TweetNode,
  YouTubeNode,
  FigmaNode,
  MarkNode,
  CollapsibleContainerNode,
  CollapsibleContentNode,
  CollapsibleTitleNode,
  PageBreakNode,
  LayoutContainerNode,
  LayoutItemNode,
  ComponentNode,
]

export default PlaygroundNodes

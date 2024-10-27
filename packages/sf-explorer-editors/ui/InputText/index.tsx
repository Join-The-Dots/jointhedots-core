import Prism from 'prismjs'
/* import 'prismjs/components/prism-python'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-java' */
import React from 'react'
import { Slate, Editable, withReact } from 'slate-react'
import { Text, createEditor, Node } from 'slate'
import { withHistory } from 'slate-history'
import { css } from '@emotion/css'

type PropsType = {
  title?: string
  value: string
  placeholder: string
  onChange?: (value: string) => void
}

function serialize(nodes) {
  return nodes.map(n => Node.string(n)).join('\n')
}

function parseValue(value: string) {
  return [
    {
      children: [
        {
          text: value || "",
        },
      ],
    },
  ]
}

const language = 'javascript'

const CodeHighlightingExample = (props: PropsType) => {
  const renderLeaf = React.useCallback(props => <Leaf {...props} />, [])
  const editor = React.useMemo(() => withHistory(withReact(createEditor())), [])
  const [editedvalue, setEditedValue] = React.useState<Node[]>(null)

  const initialValue = React.useMemo(() => {
    const value = parseValue(props.value)
    editor.children = value
    if (editedvalue) {
      setEditedValue(null)
    }
    return value
  }, [props.value])

  const onValid = React.useCallback(() => {
    if (editedvalue) {
      props.onChange?.(serialize(value))
      setEditedValue(null)
    }
  }, [editedvalue])

  const onChange = React.useCallback((newValue) => {
    if (newValue === initialValue) {
      setEditedValue(null)
    }
    else if (newValue !== editedvalue) {
      setEditedValue(newValue)
    }
  }, [editedvalue, initialValue])

  const onKeyDown = React.useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      setTimeout(onValid, 0)
    }
  }, null)

  React.useEffect(() => {
    setEditedValue(null)
  }, [initialValue])

  // decorate function depends on the language selected
  const decorate = React.useCallback(([node, path]) => {
    const ranges = []
    if (!Text.isText(node)) {
      return ranges
    }

    let start = 0
    const tokens = Prism.tokenize(node.text, Prism.languages[language])
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
  }, [language])

  const value = editedvalue || initialValue
  return (<div style={{ color: editedvalue ? "#fff" : undefined }}>
    <Slate editor={editor} initialValue={value} onChange={onChange}>
      <Editable
        onDrop={(e) => { e.preventDefault() }}
        onKeyDown={onKeyDown}
        onBlur={onValid}
        spellCheck={false}
        decorate={decorate}
        renderLeaf={renderLeaf}
        placeholder={props.placeholder || props.title}
        readOnly={!props.onChange}
      />
    </Slate>
  </div>)
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

// different token types, styles found on Prismjs website
const Leaf = false
  // Light mode
  ? ({ attributes, children, leaf }) => {
    return (
      <span
        {...attributes}
        className={css`
            font-family: monospace;
            background: transparent;
        ${leaf.comment &&
          css`
            color: slategray;
          `} 
        ${(leaf.operator || leaf.url) &&
          css`
            color: #9a6e3a;
          `}
        ${leaf.keyword &&
          css`
            color: #07a;
          `}
        ${(leaf.variable || leaf.regex) &&
          css`
            color: #e90;
          `}
        ${(leaf.number ||
            leaf.boolean ||
            leaf.tag ||
            leaf.constant ||
            leaf.symbol ||
            leaf.attrName ||
            leaf.selector) &&
          css`
            color: #905;
          `}
        ${leaf.punctuation &&
          css`
            color: #999;
          `}
        ${(leaf.string || leaf.char) &&
          css`
            color: #690;
          `}
        ${(leaf.function || leaf.className) &&
          css`
            color: #dd4a68;
          `}
        `}
      >
        {children}
      </span>
    )
  }
  // Dark mode
  : ({ attributes, children, leaf }) => {
    return (
      <span
        {...attributes}
        className={css`
            font-family: monospace;
            background: transparent;
            color: #bbb;
        ${leaf.comment &&
          css`
            color: #bbb;
          `} 
        ${(leaf.operator || leaf.url) &&
          css`
            color: #9a6e3a;
          `}
        ${leaf.keyword &&
          css`
            color: #07a;
          `}
        ${(leaf.variable || leaf.regex) &&
          css`
            color: #e90;
          `}
        ${(leaf.number ||
            leaf.boolean ||
            leaf.tag ||
            leaf.constant ||
            leaf.symbol ||
            leaf.attrName ||
            leaf.selector) &&
          css`
            color: #905;
          `}
        ${leaf.punctuation &&
          css`
            color: #bbb;
          `}
        ${(leaf.string || leaf.char) &&
          css`
            color: #690;
          `}
        ${(leaf.function || leaf.className) &&
          css`
            color: #dd4a68;
          `}
        `}
      >
        {children}
      </span>
    )
  }

// modifications and additions to prism library

Prism.languages.python = Prism.languages.extend('python', {})
Prism.languages.insertBefore('python', 'prolog', {
  comment: { pattern: /##[^\n]*/, alias: 'comment' },
})
Prism.languages.javascript = Prism.languages.extend('javascript', {})
Prism.languages.insertBefore('javascript', 'prolog', {
  comment: { pattern: /\/\/[^\n]*/, alias: 'comment' },
})
Prism.languages.html = Prism.languages.extend('html', {})
Prism.languages.insertBefore('html', 'prolog', {
  comment: { pattern: /<!--[^\n]*-->/, alias: 'comment' },
})
Prism.languages.markdown = Prism.languages.extend('markup', {})
Prism.languages.insertBefore('markdown', 'prolog', {
  blockquote: { pattern: /^>(?:[\t ]*>)*/m, alias: 'punctuation' },
  code: [
    { pattern: /^(?: {4}|\t).+/m, alias: 'keyword' },
    { pattern: /``.+?``|`[^`\n]+`/, alias: 'keyword' },
  ],
  title: [
    {
      pattern: /\w+.*(?:\r?\n|\r)(?:==+|--+)/,
      alias: 'important',
      inside: { punctuation: /==+$|--+$/ },
    },
    {
      pattern: /(^\s*)#+.+/m,
      lookbehind: !0,
      alias: 'important',
      inside: { punctuation: /^#+|#+$/ },
    },
  ],
  hr: {
    pattern: /(^\s*)([*-])([\t ]*\2){2,}(?=\s*$)/m,
    lookbehind: !0,
    alias: 'punctuation',
  },
  list: {
    pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
    lookbehind: !0,
    alias: 'punctuation',
  },
  'url-reference': {
    pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
    inside: {
      variable: { pattern: /^(!?\[)[^\]]+/, lookbehind: !0 },
      string: /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
      punctuation: /^[[\]!:]|[<>]/,
    },
    alias: 'url',
  },
  bold: {
    pattern: /(^|[^\\])(\*\*|__)(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,
    lookbehind: !0,
    inside: { punctuation: /^\*\*|^__|\*\*$|__$/ },
  },
  italic: {
    pattern: /(^|[^\\])([*_])(?:(?:\r?\n|\r)(?!\r?\n|\r)|.)+?\2/,
    lookbehind: !0,
    inside: { punctuation: /^[*_]|[*_]$/ },
  },
  url: {
    pattern: /!?\[[^\]]+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)| ?\[[^\]\n]*\])/,
    inside: {
      variable: { pattern: /(!?\[)[^\]]+(?=\]$)/, lookbehind: !0 },
      string: { pattern: /"(?:\\.|[^"\\])*"(?=\)$)/ },
    },
  },
})
Prism.languages.markdown.bold.inside.url = Prism.util.clone(
  Prism.languages.markdown.url
)
Prism.languages.markdown.italic.inside.url = Prism.util.clone(
  Prism.languages.markdown.url
)
Prism.languages.markdown.bold.inside.italic = Prism.util.clone(
  Prism.languages.markdown.italic
)
Prism.languages.markdown.italic.inside.bold = Prism.util.clone(Prism.languages.markdown.bold) // prettier-ignore

export default CodeHighlightingExample

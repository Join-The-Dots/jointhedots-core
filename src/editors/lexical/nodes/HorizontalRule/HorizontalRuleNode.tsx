import { emitJSXMarkdownText } from '@livedoc/core/ast/evaluate'
import { $createHorizontalRuleNode, HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'
import { exportAstToMarkdown, registerMarkdownTransformer } from '../../markdown/markdown-to-lexical'

export { HorizontalRuleNode }

HorizontalRuleNode.prototype["exportAST"] = function () {
   return emitJSXMarkdownText('***')
}

registerMarkdownTransformer({
   dependencies: [HorizontalRuleNode],
   export: exportAstToMarkdown,
   regExp: /^(---|\*\*\*|___)\s?$/,
   replace: (parentNode, _1, _2, isImport) => {
      const line = $createHorizontalRuleNode()

      // TODO: Get rid of isImport flag
      if (isImport || parentNode.getNextSibling() != null) {
         parentNode.replace(line)
      } else {
         parentNode.insertBefore(line)
      }

      line.selectNext()
   },
   type: 'element',
})

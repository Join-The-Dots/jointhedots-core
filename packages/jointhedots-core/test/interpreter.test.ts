import assert from 'assert'
import { evaluateExpression, EmptyScope } from '../ast/interpreter'

describe('interpreter variable declarations and block/loop scopes', () => {
   it('var declaration at program scope should be visible on empty scope', () => {
      const prog: any = {
         type: 'Program',
         body: [
            {
               type: 'VariableDeclaration',
               kind: 'var',
               declarations: [
                  { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'x' }, init: { type: 'Literal', value: 2 } }
               ]
            },
            { type: 'ExpressionStatement', expression: { type: 'Identifier', name: 'x' } }
         ]
      }

      const result = evaluateExpression(prog, EmptyScope)
      assert.strictEqual(result, 2)
      assert.strictEqual(EmptyScope.getValue('x'), 2)
   })

   it('let declaration inside block should not leak to parent scope', () => {
      const block: any = {
         type: 'BlockStatement',
         body: [
            {
               type: 'VariableDeclaration',
               kind: 'let',
               declarations: [
                  { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'a' }, init: { type: 'Literal', value: 1 } }
               ]
            },
            { type: 'ExpressionStatement', expression: { type: 'Identifier', name: 'a' } }
         ]
      }

      const inner = evaluateExpression(block, EmptyScope)
      assert.strictEqual(inner, 1)
      assert.strictEqual(EmptyScope.getValue('a'), undefined)
   })

   it('for-loop with let should create block-scoped loop variable per iteration', () => {
      const prog: any = {
         type: 'Program',
         body: [
            {
               type: 'VariableDeclaration', kind: 'var', declarations: [
                  { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'arr' }, init: { type: 'ArrayExpression', elements: [] } }
               ]
            },
            {
               type: 'ForStatement',
               init: {
                  type: 'VariableDeclaration', kind: 'let', declarations: [
                     { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'i' }, init: { type: 'Literal', value: 0 } }
                  ]
               },
               test: { type: 'BinaryExpression', operator: '<', left: { type: 'Identifier', name: 'i' }, right: { type: 'Literal', value: 3 } },
               update: { type: 'UpdateExpression', operator: '++', argument: { type: 'Identifier', name: 'i' }, prefix: false },
               body: {
                  type: 'BlockStatement',
                  body: [
                     {
                        type: 'ExpressionStatement',
                        expression: {
                           type: 'CallExpression',
                           callee: { type: 'MemberExpression', object: { type: 'Identifier', name: 'arr' }, property: { type: 'Identifier', name: 'push' }, computed: false },
                           arguments: [ { type: 'Identifier', name: 'i' } ]
                        }
                     }
                  ]
               }
            },
            { type: 'ExpressionStatement', expression: { type: 'Identifier', name: 'arr' } }
         ]
      }

      const result = evaluateExpression(prog, EmptyScope)
      assert.deepStrictEqual(result, [0,1,2])
      assert.strictEqual(EmptyScope.getValue('i'), undefined)
   })
})

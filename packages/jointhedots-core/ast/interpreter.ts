import { AST } from "."
import { MapLike } from '../common/types'

export interface InterpreterScope {
   getThis(): any
   getValue(id: string): any
   setValue(id: string, value: any): void
}

export class LocalScope<C = unknown> implements InterpreterScope {
   constructor(
      readonly $parentScope: InterpreterScope,
      readonly $thisScope: any,
      readonly locals: MapLike<any> = {},
   ) {
   }
   getThis(): any {
      return this.$thisScope
   }
   getValue(id: string): any {
      if (Object.hasOwn(this.locals, id)) {
         return this.locals[id]
      }
      else if (this.$parentScope) {
         return this.$parentScope.getValue(id)
      }
      return undefined
   }
   setValue(id: string, value: any): void {
      if (Object.hasOwn(this.locals, id)) {
         this.locals[id] = value
      }
      return this.$parentScope?.setValue(id, value)
   }
   setArguments(args: any[], params: AST.Pattern[]) {
      this.locals.arguments = args
      for (let i = 0; i < params.length; i++) {
         const param = params[i] as AST.Identifier
         this.locals[param.name] = args[i]
      }
   }
}

export const EmptyScope = new LocalScope(null, null)

export function evaluateExpression(node: AST.Any, scope: InterpreterScope): any {
   switch (node.type) {
      case 'Literal':
         return (node as AST.Literal).value

      case 'Identifier':
         return scope.getValue((node as AST.Identifier).name)

      case 'BinaryExpression': {
         const { left, right, operator } = node as AST.BinaryExpression
         const leftValue = evaluateExpression(left, scope)
         const rightValue = evaluateExpression(right, scope)

         switch (operator) {
            case '+': return leftValue + rightValue
            case '-': return leftValue - rightValue
            case '*': return leftValue * rightValue
            case '/': return leftValue / rightValue
            case '%': return leftValue % rightValue
            case '==': return leftValue == rightValue
            case '!=': return leftValue != rightValue
            case '===': return leftValue === rightValue
            case '!==': return leftValue !== rightValue
            case '<': return leftValue < rightValue
            case '<=': return leftValue <= rightValue
            case '>': return leftValue > rightValue
            case '>=': return leftValue >= rightValue
            default: throw new Error(`Unsupported binary operator: ${operator}`)
         }
      }

      case 'LogicalExpression': {
         const { left, right, operator } = node as AST.LogicalExpression
         const leftValue = evaluateExpression(left, scope)

         if (operator === '&&' && !leftValue) {
            return leftValue
         } else if (operator === '||' && leftValue) {
            return leftValue
         }
         return evaluateExpression(right, scope)
      }

      case 'UnaryExpression': {
         const { argument, operator, prefix } = node as AST.UnaryExpression
         const value = evaluateExpression(argument, scope)
         switch (operator) {
            case '-': return -value
            case '+': return +value
            case '!': return !value
            case '~': return ~value
            case 'typeof': return typeof value
            case 'void': return void value
            case 'delete':
               if (argument.type === 'MemberExpression') {
                  const { object, property, computed } = argument as AST.MemberExpression
                  const obj = evaluateExpression(object, scope)
                  const prop = computed ? evaluateExpression(property, scope) : (property as AST.Identifier).name
                  return delete obj[prop]
               }
               throw new Error(`Unsupported delete operation on type: ${argument.type}`)
            default: throw new Error(`Unsupported unary operator: ${operator}`)
         }
      }

      case 'UpdateExpression': {
         const { argument, operator, prefix } = node as AST.UpdateExpression
         const id = argument as AST.Identifier
         let value = scope.getValue(id.name)
         let updatedValue
         if (operator === '++') {
            updatedValue = prefix ? ++value : value++
         } else if (operator === '--') {
            updatedValue = prefix ? --value : value--
         } else {
            throw new Error(`Unsupported update operator: ${operator}`)
         }
         scope.setValue(id.name, updatedValue)
         return updatedValue
      }

      case 'AssignmentExpression': {
         const { left, right, operator } = node as AST.AssignmentExpression
         const value = evaluateExpression(right, scope)

         if (left.type === 'Identifier') {
            const identifier = left as AST.Identifier
            let currentValue = scope.getValue(identifier.name)

            switch (operator) {
               case '=': scope.setValue(identifier.name, value); break
               case '+=': scope.setValue(identifier.name, currentValue + value); break
               case '-=': scope.setValue(identifier.name, currentValue - value); break
               case '*=': scope.setValue(identifier.name, currentValue * value); break
               case '/=': scope.setValue(identifier.name, currentValue / value); break
               case '%=': scope.setValue(identifier.name, currentValue % value); break
               default: throw new Error(`Unsupported assignment operator: ${operator}`)
            }
            return scope.getValue(identifier.name)
         } else {
            throw new Error(`Unsupported left-hand side in assignment`)
         }
      }

      case 'CallExpression': {
         const { callee, arguments: args } = node as AST.CallExpression
         const func = evaluateExpression(callee, scope)
         const evaluatedArgs = args.map(arg => evaluateExpression(arg, scope))
         if (typeof func !== 'function') {
            throw new Error('Attempt to call a non-function')
         }
         return func.apply(scope.getThis(), evaluatedArgs)
      }

      case 'MemberExpression': {
         const { object, property, computed } = node as AST.MemberExpression
         const obj = evaluateExpression(object, scope)
         const prop = computed ? evaluateExpression(property, scope) : (property as AST.Identifier).name
         const val = obj[prop]
         if (typeof val !== 'function') return val
         else return val.bind(obj)
      }

      case 'ConditionalExpression': {
         const { test, consequent, alternate } = node as AST.ConditionalExpression
         const testResult = evaluateExpression(test, scope)
         return testResult ? evaluateExpression(consequent, scope) : evaluateExpression(alternate, scope)
      }

      case 'ThisExpression':
         return scope.getThis()

      case 'ArrayExpression':
         return (node as AST.ArrayExpression).elements.map(element => evaluateExpression(element, scope))

      case 'ObjectExpression': {
         const result: MapLike<any> = {}
         for (const prop of (node as AST.ObjectExpression).properties) {
            const { key, value } = prop as AST.Property
            const keyValue = key.type === 'Literal' ? (key as AST.Literal).value : (key as AST.Identifier).name
            result[keyValue.toString()] = evaluateExpression(value, scope)
         }
         return result
      }

      case 'FunctionExpression': {
         const funcNode = node as AST.FunctionExpression
         return function (this: any, ...args: any[]) {
            const localScope = new LocalScope(scope, this)
            localScope.setArguments(args, funcNode.params)
            return evaluateExpression(funcNode.body, localScope)
         }
      }

      case 'ArrowFunctionExpression': {
         const funcNode = node as AST.FunctionExpression | AST.ArrowFunctionExpression
         return function (...args: any[]) {
            const localScope = new LocalScope(scope, scope.getThis())
            localScope.setArguments(args, funcNode.params)
            return evaluateExpression(funcNode.body, localScope)
         }
      }

      default:
         throw new Error(`Unsupported node type: ${node.type}`)
   }
}

export type JSXElementData = {
   tag: string
   props: MapLike<any>
   additionnals?: any[]
   children?: any[]
   [ns: string]: any
}

export function evaluateJSXElementData(n: AST.JSXElement): JSXElementData {
   const { attributes } = n
   const result: any = {
      type: "element",
      tag: n.tag,
      children: n.content,
   }
   for (const attr of attributes) {
      const ns = attr.ns || "props"
      const key = attr.name
      let props = result[ns]
      if (!props) result[ns] = props = {}
      props[key] = evaluateExpression(attr.value, EmptyScope)
   }
   return result
}

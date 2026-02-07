import type { AST } from "./ast/api.ts"
import type { MapLike } from '../common/types.ts'

// Type definitions for better performance and type safety
type NodeType = AST.Any['type']

export interface InterpreterScope {
   getThis(): unknown
   getValue(id: string): unknown
   setValue(id: string, value: unknown): void
}

export class LocalScope<C = unknown> implements InterpreterScope {
   constructor(
      readonly $parentScope: InterpreterScope | null,
      readonly $thisScope: unknown,
      readonly locals: Record<string, unknown> = {},
   ) { }

   getThis(): unknown {
      return this.$thisScope
   }

   getValue(id: string): unknown {
      if (Object.hasOwn(this.locals, id)) {
         return this.locals[id]
      }
      if (this.$parentScope) {
         return this.$parentScope.getValue(id)
      }
      return undefined
   }

   setValue(id: string, value: unknown): void {
      if (Object.hasOwn(this.locals, id)) {
         this.locals[id] = value
         return
      }
      this.$parentScope?.setValue(id, value)
   }

   setArguments(args: unknown[], params: AST.Pattern[]): void {
      this.locals.arguments = args
      const len = Math.min(args.length, params.length)
      for (let i = 0; i < len; i++) {
         const param = params[i] as AST.Identifier
         this.locals[param.name] = args[i]
      }
   }
}

export const EmptyScope = new LocalScope(null, null)

// Control flow exceptions - using symbols for better performance
const RETURN_SYMBOL = Symbol('return')
const BREAK_SYMBOL = Symbol('break')
const CONTINUE_SYMBOL = Symbol('continue')

interface ControlFlowException {
   readonly symbol: symbol
   readonly value?: unknown
}

class ReturnException implements ControlFlowException {
   readonly symbol = RETURN_SYMBOL
   constructor(readonly value: unknown) { }
}

class BreakException implements ControlFlowException {
   readonly symbol = BREAK_SYMBOL
}

class ContinueException implements ControlFlowException {
   readonly symbol = CONTINUE_SYMBOL
}

// Optimized type guard using symbols
function isControlFlowException(e: unknown): e is ControlFlowException {
   return e !== null &&
      typeof e === 'object' &&
      'symbol' in e &&
      (e.symbol === RETURN_SYMBOL || e.symbol === BREAK_SYMBOL || e.symbol === CONTINUE_SYMBOL)
}

// Pre-compiled operation functions for better performance
export const BINARY_OPERATIONS = new Map<string, (l: unknown, r: unknown) => unknown>([
   ['+', (l, r) => (l as any) + (r as any)],
   ['-', (l, r) => (l as any) - (r as any)],
   ['*', (l, r) => (l as any) * (r as any)],
   ['/', (l, r) => (l as any) / (r as any)],
   ['%', (l, r) => (l as any) % (r as any)],
   ['==', (l, r) => l == r],
   ['!=', (l, r) => l != r],
   ['===', (l, r) => l === r],
   ['!==', (l, r) => l !== r],
   ['<', (l, r) => (l as any) < (r as any)],
   ['<=', (l, r) => (l as any) <= (r as any)],
   ['>', (l, r) => (l as any) > (r as any)],
   ['>=', (l, r) => (l as any) >= (r as any)],
])

export const UNARY_OPERATIONS = new Map<string, (v: unknown) => unknown>([
   ['-', (v) => -(v as any)],
   ['+', (v) => +(v as any)],
   ['!', (v) => !v],
   ['~', (v) => ~(v as any)],
   ['typeof', (v) => typeof v],
   ['void', (v) => void v],
])

export const ASSIGNMENT_OPERATIONS = new Map<string, (current: unknown, right: unknown) => unknown>([
   ['=', (_, r) => r],
   ['+=', (c, r) => (c as any) + (r as any)],
   ['-=', (c, r) => (c as any) - (r as any)],
   ['*=', (c, r) => (c as any) * (r as any)],
   ['/=', (c, r) => (c as any) / (r as any)],
   ['%=', (c, r) => (c as any) % (r as any)],
])

// Fast evaluation functions using direct dispatch
function evaluateLiteral(node: AST.Literal): unknown {
   return node.value
}

function evaluateIdentifier(node: AST.Identifier, scope: InterpreterScope): unknown {
   return scope.getValue(node.name)
}

function evaluateThisExpression(scope: InterpreterScope): unknown {
   return scope.getThis()
}

function evaluateBinaryExpression(node: AST.BinaryExpression, scope: InterpreterScope): unknown {
   const leftValue = evaluateExpression(node.left, scope)
   const rightValue = evaluateExpression(node.right, scope)

   const operation = BINARY_OPERATIONS.get(node.operator)
   if (!operation) {
      throw new Error(`Unsupported binary operator: ${node.operator}`)
   }
   return operation(leftValue, rightValue)
}

function evaluateLogicalExpression(node: AST.LogicalExpression, scope: InterpreterScope): unknown {
   const leftValue = evaluateExpression(node.left, scope)

   // Short-circuit evaluation
   if (node.operator === '&&') {
      return leftValue ? evaluateExpression(node.right, scope) : leftValue
   }
   if (node.operator === '||') {
      return leftValue ? leftValue : evaluateExpression(node.right, scope)
   }

   throw new Error(`Unsupported logical operator: ${node.operator}`)
}

function evaluateUnaryExpression(node: AST.UnaryExpression, scope: InterpreterScope): unknown {
   if (node.operator === 'delete') {
      if (node.argument.type === 'MemberExpression') {
         const memberExpr = node.argument as AST.MemberExpression
         const obj = evaluateExpression(memberExpr.object, scope) as Record<string | number | symbol, unknown>
         const prop = memberExpr.computed
            ? evaluateExpression(memberExpr.property, scope) as string | number | symbol
            : (memberExpr.property as AST.Identifier).name
         return delete obj[prop]
      }
      throw new Error(`Unsupported delete operation on type: ${node.argument.type}`)
   }

   const value = evaluateExpression(node.argument, scope)
   const operation = UNARY_OPERATIONS.get(node.operator)
   if (!operation) {
      throw new Error(`Unsupported unary operator: ${node.operator}`)
   }
   return operation(value)
}

function evaluateUpdateExpression(node: AST.UpdateExpression, scope: InterpreterScope): unknown {
   if (node.argument.type !== 'Identifier') {
      throw new Error('Update expression only supports identifiers')
   }

   const id = node.argument as AST.Identifier
   const currentValue = scope.getValue(id.name) as number

   if (node.operator === '++') {
      const newValue = currentValue + 1
      scope.setValue(id.name, newValue)
      return node.prefix ? newValue : currentValue
   }

   if (node.operator === '--') {
      const newValue = currentValue - 1
      scope.setValue(id.name, newValue)
      return node.prefix ? newValue : currentValue
   }

   throw new Error(`Unsupported update operator: ${node.operator}`)
}

function evaluateAssignmentExpression(node: AST.AssignmentExpression, scope: InterpreterScope): unknown {
   if (node.left.type !== 'Identifier') {
      throw new Error('Assignment only supports identifier left-hand side')
   }

   const identifier = node.left as AST.Identifier
   const rightValue = evaluateExpression(node.right, scope)
   const currentValue = scope.getValue(identifier.name)

   const operation = ASSIGNMENT_OPERATIONS.get(node.operator)
   if (!operation) {
      throw new Error(`Unsupported assignment operator: ${node.operator}`)
   }

   const newValue = operation(currentValue, rightValue)
   scope.setValue(identifier.name, newValue)
   return newValue
}

function evaluateCallExpression(node: AST.CallExpression, scope: InterpreterScope): unknown {
   const func = evaluateExpression(node.callee, scope)

   if (typeof func !== 'function') {
      throw new Error('Attempt to call a non-function')
   }

   // Optimize argument evaluation
   const args = new Array(node.arguments.length)
   for (let i = 0; i < node.arguments.length; i++) {
      args[i] = evaluateExpression(node.arguments[i], scope)
   }

   return func.apply(scope.getThis(), args)
}

function evaluateMemberExpression(node: AST.MemberExpression, scope: InterpreterScope): unknown {
   const obj = evaluateExpression(node.object, scope) as Record<string | number | symbol, unknown>
   const prop = node.computed
      ? evaluateExpression(node.property, scope) as string | number | symbol
      : (node.property as AST.Identifier).name

   const value = obj[prop]
   return typeof value === 'function' ? (value as Function).bind(obj) : value
}

function evaluateConditionalExpression(node: AST.ConditionalExpression, scope: InterpreterScope): unknown {
   const testResult = evaluateExpression(node.test, scope)
   return testResult
      ? evaluateExpression(node.consequent, scope)
      : evaluateExpression(node.alternate, scope)
}

function evaluateArrayExpression(node: AST.ArrayExpression, scope: InterpreterScope): unknown[] {
   const result = new Array(node.elements.length)
   for (let i = 0; i < node.elements.length; i++) {
      result[i] = evaluateExpression(node.elements[i], scope)
   }
   return result
}

function evaluateObjectExpression(node: AST.ObjectExpression, scope: InterpreterScope): Record<string, unknown> {
   const result: Record<string, unknown> = {}

   for (const prop of node.properties) {
      const property = prop as AST.Property
      const keyValue = property.key.type === 'Literal'
         ? (property.key as AST.Literal).value
         : (property.key as AST.Identifier).name
      result[String(keyValue)] = evaluateExpression(property.value, scope)
   }

   return result
}

function evaluateFunctionExpression(node: AST.FunctionExpression, scope: InterpreterScope): Function {
   return function (this: unknown, ...args: unknown[]) {
      const localScope = new LocalScope(scope, this)
      localScope.setArguments(args, node.params)
      try {
         return evaluateExpression(node.body, localScope)
      } catch (e) {
         if (isControlFlowException(e) && e.symbol === RETURN_SYMBOL) {
            return e.value
         }
         throw e
      }
   }
}

function evaluateArrowFunctionExpression(node: AST.ArrowFunctionExpression, scope: InterpreterScope): Function {
   return function (...args: unknown[]) {
      const localScope = new LocalScope(scope, scope.getThis())
      localScope.setArguments(args, node.params)
      try {
         return evaluateExpression(node.body, localScope)
      } catch (e) {
         if (isControlFlowException(e) && e.symbol === RETURN_SYMBOL) {
            return e.value
         }
         throw e
      }
   }
}

// Statement evaluation functions
function evaluateBlockStatement(node: AST.BlockStatement, scope: InterpreterScope): unknown {
   let result: unknown
   for (const stmt of node.body) {
      result = evaluateExpression(stmt, scope)
   }
   return result
}

function evaluateExpressionStatement(node: AST.ExpressionStatement, scope: InterpreterScope): unknown {
   return evaluateExpression(node.expression, scope)
}

function evaluateVariableDeclaration(node: AST.VariableDeclaration, scope: InterpreterScope): unknown {
   let lastValue: unknown
   for (const decl of node.declarations) {
      const id = (decl.id as AST.Identifier).name
      const value = decl.init ? evaluateExpression(decl.init, scope) : undefined
      scope.setValue(id, value)
      lastValue = value
   }
   return lastValue
}

function evaluateReturnStatement(node: AST.ReturnStatement, scope: InterpreterScope): never {
   const value = node.argument ? evaluateExpression(node.argument, scope) : undefined
   throw new ReturnException(value)
}

function evaluateIfStatement(node: AST.IfStatement, scope: InterpreterScope): unknown {
   if (evaluateExpression(node.test, scope)) {
      return evaluateExpression(node.consequent, scope)
   }
   if (node.alternate) {
      return evaluateExpression(node.alternate, scope)
   }
   return undefined
}

// Loop control flow handler
function handleLoopControlFlow(e: unknown, result: unknown): { shouldBreak: boolean; shouldContinue: boolean; result: unknown } {
   if (isControlFlowException(e)) {
      if (e.symbol === BREAK_SYMBOL) return { shouldBreak: true, shouldContinue: false, result }
      if (e.symbol === CONTINUE_SYMBOL) return { shouldBreak: false, shouldContinue: true, result }
      if (e.symbol === RETURN_SYMBOL) throw e
   }
   throw e
}

function evaluateWhileStatement(node: AST.WhileStatement, scope: InterpreterScope): unknown {
   let result: unknown
   while (evaluateExpression(node.test, scope)) {
      try {
         result = evaluateExpression(node.body, scope)
      } catch (e) {
         const control = handleLoopControlFlow(e, result)
         if (control.shouldBreak) break
         if (control.shouldContinue) continue
         result = control.result
      }
   }
   return result
}

function evaluateForStatement(node: AST.ForStatement, scope: InterpreterScope): unknown {
   let result: unknown

   if (node.init) evaluateExpression(node.init, scope)

   while (node.test ? evaluateExpression(node.test, scope) : true) {
      try {
         result = evaluateExpression(node.body, scope)
      } catch (e) {
         const control = handleLoopControlFlow(e, result)
         if (control.shouldBreak) break
         if (control.shouldContinue) {
            if (node.update) evaluateExpression(node.update, scope)
            continue
         }
         result = control.result
      }
      if (node.update) evaluateExpression(node.update, scope)
   }
   return result
}

// Fast dispatch table for node evaluation
type EvaluatorFunction = (node: any, scope: InterpreterScope) => unknown

const EVALUATORS = new Map<NodeType, EvaluatorFunction>([
   ['Literal', evaluateLiteral],
   ['Identifier', evaluateIdentifier],
   ['ThisExpression', (_, scope) => evaluateThisExpression(scope)],
   ['BinaryExpression', evaluateBinaryExpression],
   ['LogicalExpression', evaluateLogicalExpression],
   ['UnaryExpression', evaluateUnaryExpression],
   ['UpdateExpression', evaluateUpdateExpression],
   ['AssignmentExpression', evaluateAssignmentExpression],
   ['CallExpression', evaluateCallExpression],
   ['MemberExpression', evaluateMemberExpression],
   ['ConditionalExpression', evaluateConditionalExpression],
   ['ArrayExpression', evaluateArrayExpression],
   ['ObjectExpression', evaluateObjectExpression],
   ['FunctionExpression', evaluateFunctionExpression],
   ['ArrowFunctionExpression', evaluateArrowFunctionExpression],
   ['BlockStatement', evaluateBlockStatement],
   ['ExpressionStatement', evaluateExpressionStatement],
   ['VariableDeclaration', evaluateVariableDeclaration],
   ['ReturnStatement', evaluateReturnStatement],
   ['IfStatement', evaluateIfStatement],
   ['WhileStatement', evaluateWhileStatement],
   ['ForStatement', evaluateForStatement],
   ['BreakStatement', () => { throw new BreakException() }],
   ['ContinueStatement', () => { throw new ContinueException() }],
   ['EmptyStatement', () => undefined],
])

// Additional evaluators for missing node types
function evaluateDoWhileStatement(node: AST.DoWhileStatement, scope: InterpreterScope): unknown {
   let result: unknown
   do {
      try {
         result = evaluateExpression(node.body, scope)
      } catch (e) {
         const control = handleLoopControlFlow(e, result)
         if (control.shouldBreak) break
         if (control.shouldContinue) continue
         result = control.result
      }
   } while (evaluateExpression(node.test, scope))
   return result
}

function evaluateForInStatement(node: AST.ForInStatement, scope: InterpreterScope): unknown {
   const obj = evaluateExpression(node.right, scope) as Record<string, unknown>
   let result: unknown

   for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
         setLoopVariable(node.left, key, scope)
         try {
            result = evaluateExpression(node.body, scope)
         } catch (e) {
            const control = handleLoopControlFlow(e, result)
            if (control.shouldBreak) break
            if (control.shouldContinue) continue
            result = control.result
         }
      }
   }
   return result
}

function evaluateForOfStatement(node: AST.ForOfStatement, scope: InterpreterScope): unknown {
   const iterable = evaluateExpression(node.right, scope) as Iterable<unknown>
   let result: unknown

   for (const value of iterable) {
      setLoopVariable(node.left, value, scope)
      try {
         result = evaluateExpression(node.body, scope)
      } catch (e) {
         const control = handleLoopControlFlow(e, result)
         if (control.shouldBreak) break
         if (control.shouldContinue) continue
         result = control.result
      }
   }
   return result
}

function setLoopVariable(left: AST.VariableDeclaration | AST.Pattern, value: unknown, scope: InterpreterScope): void {
   if (left.type === 'VariableDeclaration') {
      const id = (left.declarations[0].id as AST.Identifier).name
      scope.setValue(id, value)
   } else if (left.type === 'Identifier') {
      scope.setValue((left as AST.Identifier).name, value)
   }
   // Note: Other pattern types like MemberExpression, ArrayPattern, ObjectPattern 
   // are not commonly used in for-in/for-of loops but could be supported if needed
}

function evaluateSwitchStatement(node: AST.SwitchStatement, scope: InterpreterScope): unknown {
   const discriminantValue = evaluateExpression(node.discriminant, scope)
   let matched = false
   let result: unknown

   for (const caseNode of node.cases) {
      if (!matched && caseNode.test && evaluateExpression(caseNode.test, scope) === discriminantValue) {
         matched = true
      }

      if (matched || (!caseNode.test && !matched)) {
         for (const stmt of caseNode.consequent) {
            try {
               result = evaluateExpression(stmt, scope)
            } catch (e) {
               if (isControlFlowException(e) && e.symbol === BREAK_SYMBOL) return result
               throw e
            }
         }
      }
   }
   return result
}

function evaluateThrowStatement(node: AST.ThrowStatement, scope: InterpreterScope): never {
   const value = evaluateExpression(node.argument, scope)
   throw value
}

function evaluateTryStatement(node: AST.TryStatement, scope: InterpreterScope): unknown {
   let result: unknown
   try {
      result = evaluateExpression(node.block, scope)
   } catch (e) {
      if (node.handler) {
         const param = node.handler.param ? (node.handler.param as AST.Identifier).name : undefined
         const localScope = new LocalScope(scope, scope.getThis())
         if (param) localScope.setValue(param, e)
         result = evaluateExpression(node.handler.body, localScope)
      } else {
         throw e
      }
   } finally {
      if (node.finalizer) {
         evaluateExpression(node.finalizer, scope)
      }
   }
   return result
}

function evaluateLabeledStatement(node: AST.LabeledStatement, scope: InterpreterScope): unknown {
   return evaluateExpression(node.body, scope)
}

// Additional missing node type evaluators
function evaluateProgram(node: AST.Program, scope: InterpreterScope): unknown {
   let result: unknown
   for (const stmt of node.body) {
      result = evaluateExpression(stmt, scope)
   }
   return result
}

function evaluateFunctionDeclaration(node: AST.FunctionDeclaration, scope: InterpreterScope): unknown {
   const func = function (this: unknown, ...args: unknown[]) {
      const localScope = new LocalScope(scope, this)
      localScope.setArguments(args, node.params)
      try {
         return evaluateExpression(node.body, localScope)
      } catch (e) {
         if (isControlFlowException(e) && e.symbol === RETURN_SYMBOL) {
            return e.value
         }
         throw e
      }
   }

   if (node.id) {
      scope.setValue(node.id.name, func)
   }
   return func
}

function evaluateNewExpression(node: AST.NewExpression, scope: InterpreterScope): unknown {
   const constructor = evaluateExpression(node.callee, scope) as new (...args: unknown[]) => unknown

   if (typeof constructor !== 'function') {
      throw new Error('Attempt to construct a non-function')
   }

   const args = new Array(node.arguments.length)
   for (let i = 0; i < node.arguments.length; i++) {
      args[i] = evaluateExpression(node.arguments[i], scope)
   }

   return new constructor(...args)
}

function evaluateSequenceExpression(node: AST.SequenceExpression, scope: InterpreterScope): unknown {
   let result: unknown
   for (const expr of node.expressions) {
      result = evaluateExpression(expr, scope)
   }
   return result
}

function evaluateYieldExpression(node: AST.YieldExpression, scope: InterpreterScope): unknown {
   // Basic yield support - in a full implementation this would interact with generator state
   const value = node.argument ? evaluateExpression(node.argument, scope) : undefined
   if (node.delegate) {
      // yield* expression - would need generator delegation
      throw new Error('yield* delegation not implemented')
   }
   return value
}

function evaluateTemplateLiteral(node: AST.TemplateLiteral, scope: InterpreterScope): string {
   let result = ''
   for (let i = 0; i < node.quasis.length; i++) {
      result += node.quasis[i].value.cooked || node.quasis[i].value.raw
      if (i < node.expressions.length) {
         const exprValue = evaluateExpression(node.expressions[i], scope)
         result += String(exprValue)
      }
   }
   return result
}

function evaluateTaggedTemplateExpression(node: AST.TaggedTemplateExpression, scope: InterpreterScope): unknown {
   const tag = evaluateExpression(node.tag, scope) as Function

   if (typeof tag !== 'function') {
      throw new Error('Template tag must be a function')
   }

   // Build strings array
   const strings = node.quasi.quasis.map(quasi => quasi.value.cooked || quasi.value.raw)
   Object.defineProperty(strings, 'raw', {
      value: node.quasi.quasis.map(quasi => quasi.value.raw)
   })

   // Evaluate expressions
   const values = node.quasi.expressions.map(expr => evaluateExpression(expr, scope))

   return tag(strings, ...values)
}

function evaluateSpreadElement(node: AST.SpreadElement, scope: InterpreterScope): unknown {
   // SpreadElement evaluation depends on context - this is a basic implementation
   const value = evaluateExpression(node.argument, scope)
   if (typeof value === 'string' || Array.isArray(value)) {
      return [...value as any]
   }
   if (value && typeof value === 'object') {
      return { ...value as any }
   }
   throw new Error('Invalid spread operation')
}

function evaluateObjectPattern(node: AST.ObjectPattern, scope: InterpreterScope): unknown {
   // Object destructuring pattern - would be used in assignments/declarations
   throw new Error('ObjectPattern evaluation requires assignment context')
}

function evaluateArrayPattern(node: AST.ArrayPattern, scope: InterpreterScope): unknown {
   // Array destructuring pattern - would be used in assignments/declarations
   throw new Error('ArrayPattern evaluation requires assignment context')
}

function evaluateRestElement(node: AST.RestElement, scope: InterpreterScope): unknown {
   // Rest element - would be used in destructuring contexts
   throw new Error('RestElement evaluation requires destructuring context')
}

function evaluateAssignmentPattern(node: AST.AssignmentPattern, scope: InterpreterScope): unknown {
   // Default parameter pattern - would be used in function parameters
   const defaultValue = evaluateExpression(node.right, scope)
   return defaultValue
}

function evaluateClassDeclaration(node: AST.ClassDeclaration, scope: InterpreterScope): unknown {
   const classConstructor = evaluateClassExpression(node as any, scope)
   if (node.id) {
      scope.setValue(node.id.name, classConstructor)
   }
   return classConstructor
}

function evaluateClassExpression(node: AST.ClassExpression, scope: InterpreterScope): unknown {
   const superClass = node.superClass ? evaluateExpression(node.superClass, scope) as Function : null

   // Create class constructor
   const classConstructor = function (this: any, ...args: unknown[]) {
      // Find constructor method
      const constructor = node.body.body.find(
         (method: any) => method.type === 'MethodDefinition' && method.kind === 'constructor'
      ) as AST.MethodDefinition | undefined

      if (constructor) {
         const constructorFunc = evaluateExpression(constructor.value, scope) as Function
         return constructorFunc.apply(this, args)
      } else if (superClass) {
         return superClass.apply(this, args)
      }
   }

   // Set up prototype chain
   if (superClass) {
      Object.setPrototypeOf(classConstructor.prototype, superClass.prototype)
      Object.setPrototypeOf(classConstructor, superClass)
   }

   // Add methods to prototype
   for (const member of node.body.body) {
      if (member.type === 'MethodDefinition' && member.kind !== 'constructor') {
         const method = member as AST.MethodDefinition
         const methodFunc = evaluateExpression(method.value, scope) as Function
         const key = method.computed
            ? evaluateExpression(method.key, scope) as string
            : (method.key as AST.Identifier).name

         if (method.static) {
            (classConstructor as any)[key] = methodFunc
         } else {
            classConstructor.prototype[key] = methodFunc
         }
      }
   }

   return classConstructor
}

function evaluateMethodDefinition(node: AST.MethodDefinition, scope: InterpreterScope): unknown {
   return evaluateExpression(node.value, scope)
}

function evaluateSuper(node: AST.Super, scope: InterpreterScope): unknown {
   // Super would need class context to work properly
   throw new Error('Super can only be used in class methods')
}

function evaluateMetaProperty(node: AST.MetaProperty, scope: InterpreterScope): unknown {
   if (node.meta.name === 'new' && node.property.name === 'target') {
      // new.target - would need constructor context
      return undefined
   }
   if (node.meta.name === 'import' && node.property.name === 'meta') {
      // import.meta - would need module context
      return {}
   }
   throw new Error(`Unsupported meta property: ${node.meta.name}.${node.property.name}`)
}

function evaluateAwaitExpression(node: AST.AwaitExpression, scope: InterpreterScope): unknown {
   // Basic await - in a real implementation this would handle promises
   const value = evaluateExpression(node.argument, scope)
   if (value && typeof value === 'object' && 'then' in value) {
      throw new Error('Async/await requires async context')
   }
   return value
}

function evaluateChainExpression(node: AST.ChainExpression, scope: InterpreterScope): unknown {
   try {
      return evaluateExpression(node.expression, scope)
   } catch (e) {
      // Optional chaining - return undefined on errors
      return undefined
   }
}

function evaluateImportExpression(node: AST.ImportExpression, scope: InterpreterScope): unknown {
   // Dynamic import - would need module system
   throw new Error('Dynamic import not supported in this interpreter')
}

function evaluateParenthesizedExpression(node: AST.ParenthesizedExpression, scope: InterpreterScope): unknown {
   return evaluateExpression(node.expression, scope)
}

function evaluatePrivateIdentifier(node: AST.PrivateIdentifier, scope: InterpreterScope): unknown {
   // Private fields would need class context
   throw new Error('Private identifiers require class context')
}

// Module-related evaluators (basic implementations)
function evaluateImportDeclaration(node: AST.ImportDeclaration, scope: InterpreterScope): unknown {
   throw new Error('Import declarations require module system')
}

function evaluateExportNamedDeclaration(node: AST.ExportNamedDeclaration, scope: InterpreterScope): unknown {
   if (node.declaration) {
      return evaluateExpression(node.declaration, scope)
   }
   return undefined
}

function evaluateExportDefaultDeclaration(node: AST.ExportDefaultDeclaration, scope: InterpreterScope): unknown {
   return evaluateExpression(node.declaration, scope)
}

function evaluateExportAllDeclaration(node: AST.ExportAllDeclaration, scope: InterpreterScope): unknown {
   throw new Error('Export all declarations require module system')
}

// Enhanced binary operations for missing operators
export const ENHANCED_BINARY_OPERATIONS = new Map<string, (l: unknown, r: unknown) => unknown>([
   ...BINARY_OPERATIONS,
   ['<<', (l, r) => (l as any) << (r as any)],
   ['>>', (l, r) => (l as any) >> (r as any)],
   ['>>>', (l, r) => (l as any) >>> (r as any)],
   ['|', (l, r) => (l as any) | (r as any)],
   ['^', (l, r) => (l as any) ^ (r as any)],
   ['&', (l, r) => (l as any) & (r as any)],
   ['in', (l, r) => (l as any) in (r as any)],
   ['instanceof', (l, r) => (l as any) instanceof (r as any)],
   ['**', (l, r) => (l as any) ** (r as any)],
])

// Enhanced assignment operations
export const ENHANCED_ASSIGNMENT_OPERATIONS = new Map<string, (current: unknown, right: unknown) => unknown>([
   ...ASSIGNMENT_OPERATIONS,
   ['<<=', (c, r) => (c as any) << (r as any)],
   ['>>=', (c, r) => (c as any) >> (r as any)],
   ['>>>=', (c, r) => (c as any) >>> (r as any)],
   ['|=', (c, r) => (c as any) | (r as any)],
   ['^=', (c, r) => (c as any) ^ (r as any)],
   ['&=', (c, r) => (c as any) & (r as any)],
   ['**=', (c, r) => (c as any) ** (r as any)],
   ['||=', (c, r) => c || r],
   ['&&=', (c, r) => c && r],
   ['??=', (c, r) => c ?? r],
])

// Enhanced logical operations
export const ENHANCED_LOGICAL_OPERATIONS = new Map<string, (l: unknown, r: unknown, scope: InterpreterScope) => unknown>([
   ['||', (l, r, scope) => l || evaluateExpression(r as any, scope)],
   ['&&', (l, r, scope) => l && evaluateExpression(r as any, scope)],
   ['??', (l, r, scope) => l ?? evaluateExpression(r as any, scope)],
])

// Update the existing functions to use enhanced operations
function evaluateEnhancedBinaryExpression(node: AST.BinaryExpression, scope: InterpreterScope): unknown {
   const leftValue = evaluateExpression(node.left, scope)
   const rightValue = evaluateExpression(node.right, scope)

   const operation = ENHANCED_BINARY_OPERATIONS.get(node.operator)
   if (!operation) {
      throw new Error(`Unsupported binary operator: ${node.operator}`)
   }
   return operation(leftValue, rightValue)
}

function evaluateEnhancedLogicalExpression(node: AST.LogicalExpression, scope: InterpreterScope): unknown {
   const leftValue = evaluateExpression(node.left, scope)

   const operation = ENHANCED_LOGICAL_OPERATIONS.get(node.operator)
   if (!operation) {
      throw new Error(`Unsupported logical operator: ${node.operator}`)
   }
   return operation(leftValue, node.right, scope)
}

function evaluateEnhancedAssignmentExpression(node: AST.AssignmentExpression, scope: InterpreterScope): unknown {
   if (node.left.type !== 'Identifier') {
      throw new Error('Assignment only supports identifier left-hand side')
   }

   const identifier = node.left as AST.Identifier
   const rightValue = evaluateExpression(node.right, scope)
   const currentValue = scope.getValue(identifier.name)

   const operation = ENHANCED_ASSIGNMENT_OPERATIONS.get(node.operator)
   if (!operation) {
      throw new Error(`Unsupported assignment operator: ${node.operator}`)
   }

   const newValue = operation(currentValue, rightValue)
   scope.setValue(identifier.name, newValue)
   return newValue
}

// Add all missing evaluators to the dispatch table
EVALUATORS.set('Program', evaluateProgram)
EVALUATORS.set('FunctionDeclaration', evaluateFunctionDeclaration)
EVALUATORS.set('NewExpression', evaluateNewExpression)
EVALUATORS.set('SequenceExpression', evaluateSequenceExpression)
EVALUATORS.set('YieldExpression', evaluateYieldExpression)
EVALUATORS.set('TemplateLiteral', evaluateTemplateLiteral)
EVALUATORS.set('TaggedTemplateExpression', evaluateTaggedTemplateExpression)
EVALUATORS.set('SpreadElement', evaluateSpreadElement)
EVALUATORS.set('ObjectPattern', evaluateObjectPattern)
EVALUATORS.set('ArrayPattern', evaluateArrayPattern)
EVALUATORS.set('RestElement', evaluateRestElement)
EVALUATORS.set('AssignmentPattern', evaluateAssignmentPattern)
EVALUATORS.set('ClassDeclaration', evaluateClassDeclaration)
EVALUATORS.set('ClassExpression', evaluateClassExpression)
EVALUATORS.set('MethodDefinition', evaluateMethodDefinition)
EVALUATORS.set('Super', evaluateSuper)
EVALUATORS.set('MetaProperty', evaluateMetaProperty)
EVALUATORS.set('AwaitExpression', evaluateAwaitExpression)
EVALUATORS.set('ChainExpression', evaluateChainExpression)
EVALUATORS.set('ImportExpression', evaluateImportExpression)
EVALUATORS.set('ParenthesizedExpression', evaluateParenthesizedExpression)
EVALUATORS.set('PrivateIdentifier', evaluatePrivateIdentifier)
EVALUATORS.set('ImportDeclaration', evaluateImportDeclaration)
EVALUATORS.set('ExportNamedDeclaration', evaluateExportNamedDeclaration)
EVALUATORS.set('ExportDefaultDeclaration', evaluateExportDefaultDeclaration)
EVALUATORS.set('ExportAllDeclaration', evaluateExportAllDeclaration)

// Update existing evaluators with enhanced versions
EVALUATORS.set('BinaryExpression', evaluateEnhancedBinaryExpression)
EVALUATORS.set('LogicalExpression', evaluateEnhancedLogicalExpression)
EVALUATORS.set('AssignmentExpression', evaluateEnhancedAssignmentExpression)

// Add previously missing evaluators
EVALUATORS.set('DoWhileStatement', evaluateDoWhileStatement)
EVALUATORS.set('ForInStatement', evaluateForInStatement)
EVALUATORS.set('ForOfStatement', evaluateForOfStatement)
EVALUATORS.set('SwitchStatement', evaluateSwitchStatement)
EVALUATORS.set('ThrowStatement', evaluateThrowStatement)
EVALUATORS.set('TryStatement', evaluateTryStatement)
EVALUATORS.set('LabeledStatement', evaluateLabeledStatement)
EVALUATORS.set('DebuggerStatement', () => undefined)
EVALUATORS.set('WithStatement', () => { throw new Error('WithStatement is not supported for security reasons') })

// Add support for additional node types that might be missing
EVALUATORS.set('VariableDeclarator', (node: AST.VariableDeclarator, scope: InterpreterScope) => {
   const value = node.init ? evaluateExpression(node.init, scope) : undefined
   if (node.id.type === 'Identifier') {
      scope.setValue((node.id as AST.Identifier).name, value)
   }
   return value
})

EVALUATORS.set('SwitchCase', (node: AST.SwitchCase, scope: InterpreterScope) => {
   let result: unknown
   for (const stmt of node.consequent) {
      result = evaluateExpression(stmt, scope)
   }
   return result
})

EVALUATORS.set('CatchClause', (node: AST.CatchClause, scope: InterpreterScope) => {
   return evaluateExpression(node.body, scope)
})

EVALUATORS.set('Property', (node: AST.Property, scope: InterpreterScope) => {
   return evaluateExpression(node.value, scope)
})

EVALUATORS.set('TemplateElement', (node: AST.TemplateElement) => {
   return node.value.cooked || node.value.raw
})

// Main evaluation function - optimized for performance
export function evaluateExpression(node: AST.Any, scope: InterpreterScope): unknown {
   if (!node || !node.type) {
      throw new Error('Invalid node: missing type')
   }

   const evaluator = EVALUATORS.get(node.type)
   if (evaluator) {
      try {
         return evaluator(node, scope)
      } catch (e) {
         if (isControlFlowException(e)) {
            throw e
         }
         throw new Error(`Error evaluating ${node.type}: ${e instanceof Error ? e.message : String(e)}`)
      }
   }

   throw new Error(`Unsupported node type: ${node.type}`)
}

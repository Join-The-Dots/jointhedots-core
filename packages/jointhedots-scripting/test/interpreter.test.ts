import { assert, assertEquals, assertRejects } from 'jsr:@std/assert'
import { describe, it } from 'jsr:@std/testing/bdd'
import { EmbedSyntax, parseTextTemplate } from '../src/template.ts'
import { LocalScope } from '../src/interpreter.ts'

async function evaluateTemplateProgram(code: string, vars: Record<string, unknown>) {
   const template = parseTextTemplate(`\${${code}}`, EmbedSyntax.DollarCurly)

   assertEquals(template.issues.length, 0)
   assertEquals(Object.keys(template.bindings).length, 1)

   const [binding] = Object.values(template.bindings)
   assert(binding)

   const scope = new LocalScope(null, null, vars)
   const result = await binding.evaluate(scope)
   return { result, scope }
}

function wrapTag(strings: TemplateStringsArray, ...values: unknown[]) {
   return strings.reduce((text, chunk, index) => {
      const value = index < values.length ? `<${String(values[index])}>` : ''
      return text + chunk + value
   }, '')
}

describe('interpreter template-parsed nested programs', () => {
   it('evaluates nested conditional pipelines parsed from a template', async () => {
      const state = { steps: [] as number[] }

      const { result, scope } = await evaluateTemplateProgram(`
((state, seed) => {
   state.steps.push(seed)
   if (seed > 1) {
      total += seed
      state.steps.push(((value) => {
         if (value > 2) {
            return value * 2
         }
         return value
      })(total))
   }
   return {
      total,
      steps: state.steps,
   }
})(state, 2)
      `, {
         state,
         total: 1,
      })

      assertEquals(result, {
         total: 3,
         steps: [2, 6],
      })
      assertEquals(state, {
         steps: [2, 6],
      })
      assertEquals(scope.getValue('total'), 3)
   })

   it('evaluates nested loops and computed member access from a template program', async () => {
      const board: number[][] = []

      const { result, scope } = await evaluateTemplateProgram(`
((board) => {
   for (row = 0; row < 2; row++) {
      board.push([])
      for (col = 0; col < 3; col++) {
         board[row].push(((currentRow, currentCol) => {
            return currentRow * 10 + currentCol
         })(row, col))
      }
   }
   return board
})(board)
      `, {
         board,
         row: 0,
         col: 0,
      })

      assertEquals(result, [
         [0, 1, 2],
         [10, 11, 12],
      ])
      assertEquals(board, [
         [0, 1, 2],
         [10, 11, 12],
      ])
      assertEquals(scope.getValue('row'), 2)
      assertEquals(scope.getValue('col'), 3)
   })

   it('evaluates layered loop callbacks with shared outer state from a template program', async () => {
      const history: Array<{ kind: string; value: number }> = []
      const values = [3, 1, 4, 2]

      const { result, scope } = await evaluateTemplateProgram(`
((values, history) => {
   for (index = 0; index < values.length; index++) {
      history.push(((current) => {
         if (current % 2 === 0) {
            total += current / 2
            return { kind: 'even', value: total }
         }
         total += current
         return { kind: 'odd', value: total }
      })(values[index]))
   }
   return {
      total,
      history,
   }
})(values, history)
      `, {
         values,
         history,
         index: 0,
         total: 0,
      })

      assertEquals(result, {
         total: 7,
         history: [
            { kind: 'odd', value: 3 },
            { kind: 'odd', value: 4 },
            { kind: 'even', value: 6 },
            { kind: 'even', value: 7 },
         ],
      })
      assertEquals(history, [
         { kind: 'odd', value: 3 },
         { kind: 'odd', value: 4 },
         { kind: 'even', value: 6 },
         { kind: 'even', value: 7 },
      ])
      assertEquals(scope.getValue('index'), 4)
      assertEquals(scope.getValue('total'), 7)
   })

   it('evaluates do-while loops with continue and break paths from a template program', async () => {
      const seen: number[] = []
      const values = [2, 3, 5, 4]

      const { result, scope } = await evaluateTemplateProgram(`
((values, seen) => {
   do {
      current = values[index]
      index += 1

      if (current % 2 === 0) {
         continue
      }

      seen.push(current)
      total += current

      if (total > 6) {
         break
      }
   } while (index < values.length)

   return {
      total,
      seen,
      index,
   }
})(values, seen)
      `, {
         values,
         seen,
         index: 0,
         current: 0,
         total: 0,
      })

      assertEquals(result, {
         total: 8,
         seen: [3, 5],
         index: 3,
      })
      assertEquals(seen, [3, 5])
      assertEquals(scope.getValue('current'), 5)
      assertEquals(scope.getValue('total'), 8)
   })

   it('evaluates let and const declarations inside nested flow from a template program', async () => {
      const trace: number[] = []

      const { result, scope } = await evaluateTemplateProgram(`
((seed, trace) => {
   let running = seed
   const factor = seed + 3

   for (index = 0; index < 2; index++) {
      let delta = factor + index
      trace.push(delta)
      running += delta
   }

   return {
      running,
      factor,
      trace,
   }
})(2, trace)
      `, {
         trace,
         running: 0,
         factor: 0,
         delta: 0,
         index: 0,
      })

      assertEquals(result, {
         running: 13,
         factor: 5,
         trace: [5, 6],
      })
      assertEquals(trace, [5, 6])
      assertEquals(scope.getValue('running'), 13)
      assertEquals(scope.getValue('factor'), 5)
      assertEquals(scope.getValue('delta'), 6)
      assertEquals(scope.getValue('index'), 2)
   })

   it('evaluates callbacks passed into and created inside a template program', async () => {
      const calls: string[] = []
      const values = [1, 3]
      const callback = (value: number, transform: (input: number) => number) => {
         calls.push('in:' + value)
         return transform(value) + 1
      }

      const { result, scope } = await evaluateTemplateProgram(`
((values, callback, calls) => {
   for (index = 0; index < values.length; index++) {
      outputs.push(callback(values[index], (input) => {
         calls.push('cb:' + input)
         return input * scale
      }))
   }

   return outputs
})(values, callback, calls)
      `, {
         values,
         callback,
         calls,
         outputs: [] as number[],
         scale: 2,
         index: 0,
      })

      assertEquals(result, [3, 7])
      assertEquals(calls, ['in:1', 'cb:1', 'in:3', 'cb:3'])
      assertEquals(scope.getValue('outputs'), [3, 7])
      assertEquals(scope.getValue('index'), 2)
   })

   it('evaluates async-style calls with await over synchronous values', async () => {
      const load = (value: number) => value + 2

      const { result, scope } = await evaluateTemplateProgram(`
((load) => (async () => {
   first = await load(seed)
   second = await load(first)

   return {
      first,
      second,
   }
})())(load)
      `, {
         load,
         seed: 2,
         first: 0,
         second: 0,
      })

      assertEquals(result, {
         first: 4,
         second: 6,
      })
      assertEquals(scope.getValue('first'), 4)
      assertEquals(scope.getValue('second'), 6)
   })

   it('evaluates nested async calls with await across multiple callback layers', async () => {
      const callback = (value: number) => value * 3

      const { result, scope } = await evaluateTemplateProgram(`
((callback) => (async () => {
   outer = await (async (value) => {
      inner = await (async (next) => {
         final = await callback(next + bump)
         return final + 1
      })(value * 2)

      return inner + 2
   })(start)

   return {
      outer,
      inner,
      final,
   }
})())(callback)
      `, {
         callback,
         start: 3,
         bump: 1,
         outer: 0,
         inner: 0,
         final: 0,
      })

      assertEquals(result, {
         outer: 24,
         inner: 22,
         final: 21,
      })
      assertEquals(scope.getValue('outer'), 24)
      assertEquals(scope.getValue('inner'), 22)
      assertEquals(scope.getValue('final'), 21)
   })

   it('throws when awaiting a promise-like value without async runtime support', async () => {
      const fetchLater = () => ({
         then() {
            return undefined
         },
      })

      await assertRejects(
         () => evaluateTemplateProgram(`
((fetchLater) => (async () => {
   return await fetchLater()
})())(fetchLater)
         `, {
            fetchLater,
         }),
         Error,
         'Async/await requires async context',
      )
   })

   it('evaluates for-of, switch, try-catch-finally, and template literals from a template program', async () => {
      const log: string[] = []
      const events = [
         { kind: 'add', value: 2 },
         { kind: 'boom', value: 4 },
         { kind: 'other', value: 0 },
      ]

      const { result, scope } = await evaluateTemplateProgram(`
((events, log) => {
   for (entry of events) {
      try {
         switch (entry.kind) {
            case 'add':
               score += entry.value
               break
            case 'boom':
               throw entry.value
            default:
               score -= 1
         }

         log.push(` + "`ok:${score}`" + `)
      }
      catch (error) {
         score += entry.value
         log.push(` + "`caught:${error.message}`" + `)
      }
      finally {
         log.push(` + "`final:${score}`" + `)
      }
   }

   return {
      score,
      log,
   }
})(events, log)
      `, {
         events,
         log,
         score: 1,
         entry: null,
         error: 0,
      })

      assertEquals(result, {
         score: 6,
         log: [
            'ok:3',
            'final:3',
            'caught:Error evaluating BlockStatement: Error evaluating SwitchStatement: Error evaluating ThrowStatement: 4',
            'final:7',
            'ok:6',
            'final:6',
         ],
      })
      assertEquals(log, [
         'ok:3',
         'final:3',
         'caught:Error evaluating BlockStatement: Error evaluating SwitchStatement: Error evaluating ThrowStatement: 4',
         'final:7',
         'ok:6',
         'final:6',
      ])
      assertEquals(scope.getValue('score'), 6)
   })

   it('evaluates tagged templates, delete, optional chaining, nullish coalescing, and sequence expressions', async () => {
      const target = {
         name: 'Ada',
         extra: { value: 'notes' },
      }

      const { result, scope } = await evaluateTemplateProgram(`
((tag, target, fallback) => (
   removed = delete target.extra,
   output = tag` + "`name:${target.name}, extra:${target.extra?.value ?? fallback}`" + `,
   {
      removed,
      output,
      extra: target.extra,
   }
))(tag, target, fallback)
      `, {
         tag: wrapTag,
         target,
         fallback: 'none',
         removed: false,
         output: '',
      })

      assertEquals(result, {
         removed: true,
         output: 'name:<Ada>, extra:<none>',
         extra: undefined,
      })
      assertEquals(target, { name: 'Ada' } as any)
      assertEquals(scope.getValue('removed'), true)
      assertEquals(scope.getValue('output'), 'name:<Ada>, extra:<none>')
   })

   it('evaluates class expressions, construction, static methods, and bound instance methods', async () => {
      const { result, scope } = await evaluateTemplateProgram(`
((base) => {
   Box = class {
      add(delta) {
         return base + delta
      }

      static describe(prefix) {
         return prefix + ':' + base
      }
   }

   instance = new Box()
   method = instance.add

   return {
      sum: method(5),
      label: Box.describe('value'),
   }
})(7)
      `, {
         Box: null,
         instance: null,
         method: null,
      })

      assertEquals(result, {
         sum: 12,
         label: 'value:7',
      })
      assert(scope.getValue('Box'))
      assert(scope.getValue('instance'))
      assert(scope.getValue('method'))
   })

   it('evaluates class declarations with instance and static methods from a template program', async () => {
      const { result, scope } = await evaluateTemplateProgram(`
((base) => {
   class Box {
      value() {
         return base + 1
      }

      static describe(label) {
         return label + ':' + base
      }
   }

   instance = new Box()

   return {
      value: instance.value(),
      label: Box.describe('declared'),
   }
})(4)
      `, {
         Box: null,
         instance: null,
      })

      assertEquals(result, {
         value: 5,
         label: 'declared:4',
      })
      assert(scope.getValue('Box'))
      assert(scope.getValue('instance'))
   })
})

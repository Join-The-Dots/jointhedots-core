import React from "react"
import { ErrorDisplayer } from "@livedoc/core/react/ErrorBoundary"
import { InstrumentationZone } from "./InstrumentationZone"
import { IInstrumentationProvider, InstrumentationController } from "packages/livedoc-ui/instrumentation"
import "./index.scss"

export * from "./InstrumentationZone"
export * from "./InstrumentationSupport"
export * from "./InstrumentationHandle"

class InstrumentationTarget extends Function {
   constructor(
      public component: React.ElementType,
      public controller: any,
   ) {
      super()
   }
}

const InstrumentationControllerSymbol = Symbol("Controller symbol")

const InstrumentationHandler: ProxyHandler<InstrumentationTarget> = {
   apply(target, self, args) {
      return <InstrumentationZone controller={target.controller}>
         {React.createElement(target.component, args[0])}
      </InstrumentationZone>
   },
   set(target, prop, value) {
      if (prop === InstrumentationControllerSymbol) {
         target.controller = value
         return true
      }
      return Reflect.set(target, prop, value)
   }
}

function ErrorFallback(controller: InstrumentationController, message: string): React.ElementType {
   console.error(message)
   return function () {
      return (<InstrumentationZone controller={controller}>
         <ErrorDisplayer error={new Error(message)} />
      </InstrumentationZone>)
   }
}

export class ViewInstrumentation implements IInstrumentationProvider {
   createInstrumentedView(component: React.ElementType, controller: InstrumentationController): React.ElementType {
      if (isValidReactComponent(component)) {
         const instrumented = new InstrumentationTarget(component, controller)
         return new Proxy(instrumented, InstrumentationHandler) as any
      }
      else {
         return ErrorFallback(controller, "Bad component: " + controller.getDisplayInfos().title)
      }
   }
   updateInstrumentedView(InstrumentedView: React.ElementType, controller: InstrumentationController): React.ElementType {
      if (InstrumentedView instanceof InstrumentationTarget) {
         InstrumentedView[InstrumentationControllerSymbol] = controller
      }
      return InstrumentedView
   }
}

function isValidReactComponent(component: any): boolean {
   switch (typeof component) {
      case 'function': return true
      case 'string': return true
      case 'symbol': return true
      default: return false
   }
}

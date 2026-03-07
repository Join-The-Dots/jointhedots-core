import React, { createContext, useContext, useMemo } from 'react'
import "./style.scss"

export type ErrorDisplayerType<E extends Error = Error> = React.ComponentType<{
   error: E
   onRetry?: () => void
}>

export function ErrorDisplayer({ error, onRetry }: { error: Error, onRetry?: () => void }) {
   const message = `${error.name}: ${error.message}`
   return <div className="JDT-ErrorBoundary" title={message}>
      <pre className="msg">{message}</pre>
      {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
   </div>
}

interface IErrorReconcilier {
   getErrorDisplayer(error: Error): ErrorDisplayerType | null
}

const ErrorReconciliersCtx = createContext<IErrorReconcilier>(null)

// React 19 types removed props/setState from class components
class Component<P = {}, S = {}> extends React.Component<P, S> {
   declare props: Readonly<P>
   declare setState: React.Component<P, S>['setState']
}

export class ErrorBoundary extends Component<{
   children: React.ReactNode
}, {
   error?: Error
   displayer?: ErrorDisplayerType
}> {
   static contextType = ErrorReconciliersCtx
   declare context: IErrorReconcilier
   state = {} as { error?: Error, displayer?: ErrorDisplayerType }
   componentDidCatch(error: Error) {
      const { context } = this
      const displayer = context?.getErrorDisplayer(error) || getGlobalErrorDisplayer(error)
      this.setState({ error, displayer })
   }
   render() {
      const { error } = this.state
      if (error) {
         const Displayer = this.state.displayer
         return <Displayer
            error={error}
            onRetry={() => this.setState({ error: undefined })}
         />
      }
      return this.props.children || null
   }
}

export function ErrorReconcilier({ errorClass, errorDisplayer, children }: {
   errorClass: new () => Error
   errorDisplayer: ErrorDisplayerType
   children: React.ReactNode
}) {
   const parent = useContext(ErrorReconciliersCtx)
   const reconcilier = useMemo<IErrorReconcilier>(() => ({
      getErrorDisplayer(error: Error) {
         for (let cur = error; cur; cur = Object.getPrototypeOf(cur)) {
            if (cur.constructor === errorClass) return errorDisplayer
         }
         return parent?.getErrorDisplayer(error) ?? null
      }
   }), [parent, errorClass, errorDisplayer])

   return <ErrorReconciliersCtx.Provider value={reconcilier}>
      {children}
   </ErrorReconciliersCtx.Provider>
}

function getGlobalErrorDisplayer(error: Error) {
   for (let cur = error; cur; cur = Object.getPrototypeOf(cur)) {
      const ctor = cur.constructor
      const displayer = ErrorDisplayers.get(ctor)
      if (displayer) return displayer
   }
   return null
}

const ErrorDisplayers = new Map<Function, ErrorDisplayerType>()
ErrorDisplayers.set(Error, ErrorDisplayer)

export function registerErrorDisplayer<E extends Error>(errorClass: new (...args) => E, displayer: ErrorDisplayerType<E>) {
   ErrorDisplayers.set(errorClass, displayer)
}

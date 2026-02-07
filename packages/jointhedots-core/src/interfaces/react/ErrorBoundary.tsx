import React, { createContext } from 'react'
import "./style.scss"

export type ErrorDisplayerType<E extends Error = Error> = React.ComponentType<{
   error: E
   onRetry?: () => void
}>

export class ErrorDisplayer extends React.Component<{
   error: Error
   onRetry?: () => void
}> {
   render() {
      const { error, onRetry } = this.props
      const message = `${error.name}: ${error.message}`
      return <div className="JDT-ErrorBoundary" title={message}>
         <pre className="msg">
            {message}
         </pre>
         {onRetry && <button className="btn" onClick={onRetry}>
            {"Retry"}
         </button>}
      </div>
   }
}

const ErrorReconciliers = createContext<ErrorReconcilier>(null)

export class ErrorBoundary extends React.Component<{
   children: React.ReactNode
}> {
   static contextType = ErrorReconciliers
   declare context: ErrorReconcilier
   state: {
      error?: Error,
      displayer?: ErrorDisplayerType
   } = {}
   componentDidCatch(error: Error) {
      const { context } = this
      const displayer = context?.getErrorDisplayer(error) || getErrorDisplayer(error)
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
      } else {
         return this.props.children || null
      }
   }
}

export class ErrorReconcilier extends React.Component<{
   errorClass: new () => Error
   errorDisplayer: ErrorDisplayerType
   children: React.ReactNode
}> {
   static contextType = ErrorReconciliers
   declare context: ErrorReconcilier

   getErrorDisplayer(error: Error) {
      for (let cur = error; cur; cur = Object.getPrototypeOf(cur)) {
         const ctor = cur.constructor
         for (let rec = this as ErrorReconcilier; rec; rec = rec.context) {
            if (rec.props.errorClass === ctor) return rec.props.errorDisplayer
         }
      }
      return null
   }
   render() {
      return this.props.children || null
   }
}

function getErrorDisplayer(error: Error) {
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

import React from 'react'

export class ErrorDisplayer extends React.Component<{
   error: Error
   onRetry?: () => void
}> {
   render() {
      const { error, onRetry } = this.props
      const message = `${error.name}: ${error.message}`
      return <div className="LDX-Instrumentation-Error" title={message}>
         <pre className="msg">
            {message}
         </pre>
         {onRetry && <button className="btn" onClick={onRetry}>
            {"Retry"}
         </button>}
      </div>
   }
}

export class ErrorBoundary extends React.Component<{
   children: React.ReactNode
}, { error?: Error }> {
   state = { error: null }
   componentDidCatch(error: Error) {
      this.setState({ error });
   }
   render() {
      const { error } = this.state
      if (error) {
         return <ErrorDisplayer
            error={error}
            onRetry={() => this.setState({ error: undefined })}
         />
      } else {
         return <>{this.props.children}</>
      }
   }
}

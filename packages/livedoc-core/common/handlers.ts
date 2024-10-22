
export class HandlersManifold<P> {
   handlers = new Set<(payload: P) => boolean | void>()
   register(handler: (payload: P) => boolean | void): () => void {
      this.handlers.add(handler)
      return () => { this.handlers.delete(handler) }
   }
   apply(payload: P): boolean {
      for (const handler of this.handlers) {
         if (handler(payload) === true) {
            return true
         }
      }
      return false
   }
}


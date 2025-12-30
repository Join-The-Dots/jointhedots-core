
export class Pipeline<T> implements PromiseLike<T> {
   private resolvers: ((value: T) => void)[] = []
   private value: T | undefined
   private paused = false

   emit(value: T) {
      console.info("> emit:", value)
      this.value = value
      if (!this.paused) {
         this.resolvers.forEach(r => r(value))
         this.resolvers = []
      }
      return this
   }

   then<R = T>(onfulfilled?: ((value: T) => R | PromiseLike<R>) | null) {
      if (this.value !== undefined && !this.paused) {
         return Promise.resolve(onfulfilled?.(this.value) ?? this.value as any)
      } else {
         return new Promise<R>((resolve) => {
            this.resolvers.push(v => resolve(onfulfilled?.(v) ?? v as any))
         })
      }
   }

   map<R>(fn: (value: T) => R): Pipeline<R> {
      const next = new Pipeline<R>()
      this.subscribe(v => next.emit(fn(v)))
      return next
   }

   filter(fn: (value: T) => boolean): Pipeline<T> {
      const next = new Pipeline<T>()
      this.subscribe(v => { if (fn(v)) next.emit(v) })
      return next
   }

   pipe<R>(fn: (pipeline: Pipeline<T>) => Pipeline<R>): Pipeline<R> {
      return fn(this)
   }

   pause() {
      this.paused = true
      return this
   }

   resume() {
      this.paused = false
      if (this.value !== undefined) {
         this.resolvers.forEach(r => r(this.value!))
         this.resolvers = []
      }
      return this
   }

   getValue() {
      return this.value
   }

   subscribe(listener: (value: T) => void) {
      this.listeners ??= new Set()
      this.listeners.add(listener)
      if (this.value !== undefined) listener(this.value)
      return () => this.listeners.delete(listener)
   }

   private listeners: Set<(value: T) => void>
}

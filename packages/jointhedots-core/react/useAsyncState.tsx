import React from "react"

export class AsyncState<T> {
   private promise: Promise<T> = null
   private dispatch: (x: T) => void = null
   private updateTimer: any = null
   private shallUpdate: boolean = true
   private updater: () => Promise<T>
   private deps: any[]
   constructor(
      private value: T,
      private updateTimeout: number,
   ) {
   }
   public use(updater: () => Promise<T>, deps: any[]) {
      this.updater = updater
      if (deps !== this.deps) {
         const prevDeps = this.deps
         this.deps = deps
         if (deps?.length === prevDeps?.length) {
            if (deps) {
               for (let i = 0; i < deps.length; i++) {
                  if (deps[i] !== prevDeps[i]) {
                     return this.update()
                  }
               }
            }
         }
         else {
            return this.update()
         }
      }
   }
   public initiate(dispatch: (x: T) => void) {
      this.dispatch = dispatch
      this.dispatch(this.value)
   }
   private cancelAutoUpdate() {
      if (this.updateTimer) {
         clearTimeout(this.updateTimer)
         this.updateTimer = null
      }
   }
   private scheduleAutoUpdate() {
      this.cancelAutoUpdate()
      if (this.shallUpdate) {
         this.update()
      }
      else if (this.updateTimeout > 0) {
         this.updateTimer = setTimeout(() => {
            this.updateTimer = null
            this.update()
         }, this.updateTimeout)
      }
   }
   public get isWaiting(): boolean {
      return this.promise !== null
   }
   public get hasState(): boolean {
      return this.value !== undefined
   }
   public get autoUpdate(): number {
      return this.updateTimeout
   }
   public set autoUpdate(timeout: number) {
      this.updateTimeout = timeout
      this.cancelAutoUpdate()
      this.update()
   }
   public set(value: T) {
      if (this.value !== value) {
         this.value = value
         this.dispatch && this.dispatch(value)
      }
   }
   public get(): T {
      return this.value
   }
   public update() {
      try {
         if (this.promise) {
            this.shallUpdate = true
            this.cancelAutoUpdate()
         }
         else {
            const result = this.updater()
            this.shallUpdate = false
            if (result instanceof Promise) {
               this.promise = result
               result.then((value) => {
                  this.promise = null
                  this.set(value)
                  this.scheduleAutoUpdate()
               }, (e) => {
                  this.promise = null
                  this.scheduleAutoUpdate()
                  console.log(e)
               })
            }
            else {
               this.scheduleAutoUpdate()
            }
         }
      }
      catch (e) {
         this.scheduleAutoUpdate()
         console.log(e)
      }
   }
   public cancel() {
      this.dispatch = null
      this.promise = null
      this.updateTimeout = 0
      this.cancelAutoUpdate()
   }
   public waiting(render: (data: T) => React.ReactNode): React.ReactNode {
      if (this.isWaiting == true) {
         return <CircularProgress />
      }
      return render(this.value)
   }
   public using(render: (data: T) => React.ReactNode): React.ReactNode {
      if (this.hasState == false) {
         return <CircularProgress />
      }
      return render(this.value)
   }
}

export function useAsyncState<T>(updater: () => Promise<T>, deps: any[], initialState?: T, updateTime?: number): AsyncState<T> {
   const [state] = React.useState<AsyncState<T>>(() => new AsyncState<T>(initialState, updateTime))
   const [value, setValue] = React.useState<T>(initialState)
   state.use(updater, deps)
   React.useEffect(() => {
      state.initiate(setValue)
      return () => state.cancel()
   }, null)
   return state
}

export function waiting(render: () => React.ReactElement, ...waiteds: AsyncState<any>[]): React.ReactElement {
   for (const w of waiteds) {
      if (w.isWaiting == true) {
         return <CircularProgress />
      }
   }
   return render()
}

export function using(render: () => React.ReactElement, ...waiteds: AsyncState<any>[]): React.ReactElement {
   for (const w of waiteds) {
      if (w.hasState == false) {
         return <CircularProgress />
      }
   }
   return render()
}

function CircularProgress() {
   return <div>...</div>
}

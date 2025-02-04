import { Listenable } from "../observable/listenable"
import { IInstrumentationProvider } from "@livedoc/ui/instrumentation"


export enum InterpreterStatus {
   NotLoaded,
   Installing,
   Loading,
   Ready,
}

export class InterpreterConfig extends Listenable {
   edition: boolean = false
   simulation: boolean = false
   status: InterpreterStatus = InterpreterStatus.NotLoaded
   instrumentation_provider: IInstrumentationProvider = null

   async use(): Promise<InterpreterConfig> {
      if (this.status === InterpreterStatus.NotLoaded) {

         // Installing configure providers
         this.status = InterpreterStatus.Installing
         await this.executeEvent("install")

         // Setup resources
         this.status = InterpreterStatus.Loading
         await this.executeEvent("load")

         // Startup application
         this.status = InterpreterStatus.Ready
         await this.executeEvent("ready")
      }
      return this
   }
   setInstrumentation(instrumentation: IInstrumentationProvider) {
      this.instrumentation_provider = instrumentation
   }
}

export const Interpreter = new InterpreterConfig()

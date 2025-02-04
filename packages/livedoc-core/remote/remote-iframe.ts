import { CmdPayload, CmdResult, Cmdlet, CommandExecutor } from "./cmds/types";

enum PipeCmd {
   Connect = ":connect",
   Disconnect = ":disconnect",
   Command = ":command",
   Message = ":message",
}

type PipeConnectCmd = {
   cmd: PipeCmd.Connect
   deviceId: string
}

type PipeDisconnectCmd = {
   cmd: PipeCmd.Disconnect
}

type PipeCommandCmd = {
   cmd: PipeCmd.Command
   stream: number
   payload?: CmdPayload<Cmdlet>
}

type PipeMessageCmd = {
   cmd: PipeCmd.Message
   from?: string
   stream: number
   data?: any
   error?: string
}

type PendingReq = {
   payload: CmdPayload<Cmdlet>
   resolve: any
   reject: any
}

export class WindowCommandPipe {
   isAlive = false
   isReady = false
   pendings: PendingReq[] = null
   streams = new Map<number, (cmd: CmdPayload<Cmdlet>) => void>()
   streams_ids = 0
   deviceWindow: Window
   constructor(
      public deviceId: string = null,
      readonly name: string,
      readonly executors: Map<string, CommandExecutor<Cmdlet>>,
   ) {
   }
   connect(contentWindow: Window): WindowCommandPipe {
      if (this.isAlive) this.dispose()
      this.isAlive = true
      this.deviceWindow = contentWindow
      window.addEventListener("message", this.listener)
      this.send<PipeConnectCmd>({ cmd: PipeCmd.Connect, deviceId: this.deviceId })
      return this
   }

   async execute<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>> {
      if (this.isReady) {
         return new Promise((resolve, reject) => {
            const stream = this.streams_ids++
            this.streams.set(stream, (msg: PipeMessageCmd) => {
               this.streams.delete(stream)
               if (msg.error) reject(new Error(msg.error))
               else resolve(msg.data)
            })
            this.send<PipeCommandCmd>({
               cmd: PipeCmd.Command,
               stream,
               payload,
            })
         })
      }
      else if (this.isAlive) {
         return new Promise((resolve, reject) => {
            if (!this.pendings) this.pendings = []
            this.pendings.push({
               payload,
               resolve,
               reject,
            })
         })
      }
      else {
         return Promise.reject(new Error("pipe disconnected"))
      }
   }

   dispose() {
      if (this.isAlive) {
         this.isAlive = false
         this.isReady = false
         window.removeEventListener("message", this.listener)
         this.send<PipeDisconnectCmd>({ cmd: PipeCmd.Disconnect })

         if (this.pendings) {
            const reqs = this.pendings
            this.pendings = null
            for (const req of reqs) {
               req.reject(new Error("pipe disconnected"))
            }
         }
         for (const cb of Array.from(this.streams.values())) {
            cb(new Error("pipe disconnected"))
         }
      }
   }

   private send<T>(msg: T) {
      this.deviceWindow.postMessage(msg, "*")
   }
   private listener = (e: MessageEvent) => {
      const { source, data } = e
      if (source === this.deviceWindow) {
         switch (data?.cmd) {
            case PipeCmd.Connect: {
               if (!this.isReady) {
                  this.isReady = true
                  if (!this.deviceId) this.deviceId = data?.deviceId as string
                  this.send<PipeConnectCmd>({ cmd: PipeCmd.Connect, deviceId: this.deviceId })
                  this.executePendings()
               }
            } break
            case PipeCmd.Command: {
               this.receiveCommand(data as PipeCommandCmd)
            } break
            case PipeCmd.Message: {
               this.receiveMessage(data as PipeMessageCmd)
            } break
            case PipeCmd.Disconnect: {
               this.dispose()
            } break
         }
      }
   }
   private async receiveCommand(cmd: PipeCommandCmd) {
      const { payload } = cmd
      const executor = this.executors.get(payload.cmd)
      if (executor) {
         try {
            const result = await executor(payload, this)
            this.send<PipeMessageCmd>({
               cmd: PipeCmd.Message,
               from: payload.cmd,
               stream: cmd.stream,
               data: result,
            })
         }
         catch (e) {
            console.error(`pipe ${this.name} command crash:`, cmd, e)
            this.send<PipeMessageCmd>({
               cmd: PipeCmd.Message,
               stream: cmd.stream,
               error: e?.message || "fail",
            })
         }
      }
      else {
         console.error(`pipe ${this.name} receive invalid command:`, cmd)
      }
   }
   private async receiveMessage(cmd: PipeMessageCmd) {
      const stream_cb = this.streams.get(cmd.stream)
      if (stream_cb) {
         stream_cb(cmd)
      }
      else {
         //console.error(`pipe ${this.name} receive invalid message:`, cmd)
      }
   }
   private executePendings() {
      if (this.isReady && this.pendings) {
         const reqs = this.pendings
         this.pendings = null
         for (const req of reqs) {
            this.execute(req.payload).then(req.resolve, req.reject)
         }
      }
   }
}

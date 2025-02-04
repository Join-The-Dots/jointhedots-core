import { CmdPayload, CmdResult, Cmdlet } from "./cmds/types"

export interface DeviceSocket {
   execute<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>>
}

class DeviceSocketsManifold {
   sockets: DeviceSocket[] = []
   master: DeviceSocket = new StubMasterSocket()
   dispatch<C extends Cmdlet>(payload: CmdPayload<C>): Promise<unknown> {
      const reqs = this.sockets.map(s => s.execute(payload).catch(e => undefined))
      return Promise.all(reqs)
   }
   execute<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>[]> {
      const reqs = this.sockets.map(s => s.execute(payload))
      return Promise.all(reqs)
   }
   registerSocket(socket: DeviceSocket) {
      this.sockets.push(socket)
      if (this.master instanceof StubMasterSocket) this.master = socket
   }
}


class StubMasterSocket implements DeviceSocket {
   execute<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>> {
      return undefined
   }
}

export const DeviceSockets = new DeviceSocketsManifold()

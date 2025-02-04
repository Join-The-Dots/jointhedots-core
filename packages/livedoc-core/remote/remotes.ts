import { CmdPayload, CmdResult, Cmdlet, ICommandPipe } from "@livedoc/core/remote/cmds/types"
import { IDeviceWatcher, DeviceInspector, installRemoteInspectorFeature } from "./remote-inspector"
import { TargetApi, TargetCmd } from "./cmds/target"
import { Listenable } from "@livedoc/core/observable/listenable"

export type DeviceAttribute<T = any> = {
   name: string
   norm: string
}

export abstract class DeviceRemote extends Listenable implements ICommandPipe {
   abstract execute<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>>
   abstract getAttributes(): Promise<DeviceAttribute[]>
   abstract getAttributeContent<T>(attr: DeviceAttribute<T>): Promise<T>
   abstract setAttributeContent<T>(attr: DeviceAttribute<T>, content: T): Promise<unknown>
   abstract acquireInspector(): Promise<DeviceInspector>
   abstract reload(): Promise<boolean>
}

export abstract class BasicDeviceRemote extends DeviceRemote implements IDeviceWatcher {
   inspector: DeviceInspector = null

   abstract getAttributes(): Promise<DeviceAttribute[]>
   abstract getAttributeContent<T>(attr: DeviceAttribute<T>): Promise<T>
   abstract setAttributeContent<T>(attr: DeviceAttribute<T>, content: T): Promise<unknown>

   constructor(readonly deviceId: string) {
      super()
   }
   async acquireInspector(): Promise<DeviceInspector> {
      if (!this.inspector) {
         const sessionId = crypto.randomUUID()
         const status = await this.execute<TargetApi["OpenInspector"]>({
            cmd: TargetCmd.OpenInspector,
            sessionId,
         })
         if (status) {
            this.inspector = new DeviceInspector(sessionId, this)
            this.inspector.addWatcher(this)
         }
      }
      return this.inspector
   }
   onDeviceClose(target: DeviceInspector) {
      this.inspector = null
   }
}

export function installRemotesFeature() {
   installRemoteInspectorFeature()
}

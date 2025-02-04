import React from 'react'
import { BasicDeviceRemote, DeviceAttribute } from '@livedoc/core/remote'
import { WindowCommandPipe } from "@livedoc/core/remote"
import { HostRouter } from "@livedoc/core/remote"
import { CmdPayload, CmdResult, Cmdlet } from "@livedoc/core/remote"
import { TargetApi, TargetCmd } from '@livedoc/core/remote'

export type WorkbenchAttribut = {
   componentId: string
   componentProps: any
}

export type InnerDeviceAttributes = {
   workbench: WorkbenchAttribut
}

class LocalResource<T = any> {
   private content: T = undefined
   constructor(readonly norm: string, readonly identifier: string) {
   }
   get key(): string {
      return `${this.norm}://${this.identifier}`
   }
   get(): T {
      if (this.content !== undefined) return this.content
      return this.load()
   }
   set(content: T) {
      if (this.content !== content) {
         this.content = content
         this.store()
      }
   }
   load(defaultContent: T = undefined): T {
      const { key } = this
      try {
         const data = window.localStorage.getItem(key)
         if (typeof data === "string") return JSON.parse(data)
         else return defaultContent
      }
      catch (e) {
         console.error(`Cannot load local component '${key}': ${e.message}`)
         return defaultContent
      }
   }
   store() {
      const { key } = this
      try {
         if (this.content !== undefined) {
            const data = JSON.stringify(this.content)
            window.localStorage.setItem(key, data)
         }
         else {
            window.localStorage.removeItem(key)
         }
         return true
      }
      catch (e) {
         console.error(`Cannot store local component '${key}': ${e.message}`)
         return false
      }
   }
   remove() {
      window.localStorage.removeItem(this.key)
      this.content = undefined
   }
   dispose() {
      const { key } = this
      this.store()
      if (localResources.get(key) === this) {
         localResources.delete(key)
      }
   }
}

const localResources = new Map<string, LocalResource>()

export function getLocalResourceStorage<T = any>(norm: string, identifier: string, defaultContent: T = undefined): T {
   const key = `resource://${norm}/${identifier}`
   try {
      const data = window.localStorage.getItem(key)
      if (typeof data === "string") return JSON.parse(data)
      else return defaultContent
   }
   catch (e) {
      console.error(`Cannot load local resource '${key}': ${e.message}`)
      return defaultContent
   }
}

export function setLocalResourceStorage<T = any>(norm: string, identifier: string, content: T) {
   const key = `resource://${norm}/${identifier}`
   try {
      if (content !== undefined) {
         const data = JSON.stringify(content)
         window.localStorage.setItem(key, data)
      }
      else {
         window.localStorage.removeItem(key)
      }
      return true
   }
   catch (e) {
      console.error(`Cannot store local resource '${key}': ${e.message}`)
      return false
   }
}

export class InnerDeviceRemote extends BasicDeviceRemote {
   static attibutes = [{
      norm: "workbench",
      name: "workbench",
   }]
   pipe: WindowCommandPipe = null
   frame: HTMLIFrameElement = null
   workbench: WorkbenchAttribut = null

   constructor(componentId: string) {
      super(crypto.randomUUID())
      this.pipe = new WindowCommandPipe(this.deviceId, "host", HostRouter.executors)
      this.workbench = getLocalResourceStorage<WorkbenchAttribut>("workbench", componentId)
      if (!this.workbench) this.workbench = {
         componentId,
         componentProps: {}
      }
   }
   async connect(frame: HTMLIFrameElement) {
      if (this.frame !== frame) {
         this.pipe.dispose()
         this.executeEvent("offline", this)
         this.frame = frame
         if (frame) {
            this.pipe.connect(frame.contentWindow)
            await this.pipe.execute<TargetApi["DisplayContent"]>({
               cmd: TargetCmd.DisplayContent,
               modelId: this.workbench.componentId,
               props: this.workbench.componentProps,
            })
            this.executeEvent("online", this)
         }
      }
   }
   async getAttributes(): Promise<DeviceAttribute[]> {
      return InnerDeviceRemote.attibutes
   }
   async getAttributeContent(attr: DeviceAttribute): Promise<any> {
      switch (attr.name) {
         case "workbench":
            return this.workbench
         default:
            return null
      }
   }
   async setAttributeContent(attr: DeviceAttribute, content: any): Promise<unknown> {
      switch (attr.name) {
         case "workbench":
            return this.setWorkbench(content)
         default:
            return null
      }
   }
   async setWorkbench(workbench: WorkbenchAttribut) {
      this.workbench = workbench
      await this.pipe.execute<TargetApi["DisplayContent"]>({
         cmd: TargetCmd.DisplayContent,
         modelId: workbench.componentId,
         props: workbench.componentProps,
      })
      setLocalResourceStorage<WorkbenchAttribut>("workbench", workbench.componentId, this.workbench)
   }
   async reload() {
      this.inspector?.unmount()
      this.frame.contentWindow.location.reload()
      return true
   }
   execute<C extends Cmdlet>(payload: CmdPayload<C>): Promise<CmdResult<C>> {
      if (this.pipe) {
         return this.pipe.execute(payload)
      }
      else {
         throw new Error(`Device offline`)
      }
   }
   dispose() {
      if (this.pipe) {
         this.pipe.dispose()
         this.executeEvent("offline", this)
         this.pipe = null
      }
   }
}

export function InnerDeviceComponent(props: {
   componentId: string
   onDevice: (device: InnerDeviceRemote) => void
}) {
   const { componentId, onDevice } = props

   const useContentFrame = React.useCallback((frame: HTMLIFrameElement) => {
      if (frame) {
         frame.onload = async () => {
            const newPipe = new InnerDeviceRemote(componentId)
            newPipe.connect(frame)
            onDevice(newPipe)
         }
      }
   }, [])

   return <>
      <iframe
         className="Frame"
         title="Builder Content"
         src={"/builder.workbench.html"}
         ref={useContentFrame}
      />
   </>
}


import { generateKey } from "crypto"
import { MapLike } from "../common/types"
import { acquireComponent, ComponentEntry, ComponentResource, ComponentsRegistry } from "../library/manifold"
import { useEffect, useState } from "react"

export type LogKind =
   "error" |
   "warn" |
   "notify" |
   "info"

export interface ILogDispatcher {
   notifyError(error: Error, subject?: any)
   notifyObject(object: LogObject)
}

export interface ILogSubject {
   getSubject(): string
}

export interface LogAction {
   scenario: string
   icon?: string // Object icon
   title?: string // Object name
   summary?: string // Object short description
   optional?: boolean
   attributes?: MapLike<string | number>
   doc_uri?: string
}

export interface LogObject {
   id: string
   kind: LogKind
   message: string // Object short description
   component_id: string // Object resource or component id
   doc_uri?: string

   icon?: string // Object icon
   title?: string // Object name
   attributes?: MapLike<string | number>
   actions?: LogAction[] // Object tooling list
}

class ConsoleLog implements ILogDispatcher {
   notifyError(error: Error, subject?: any) {
      console.error(error)
      this.notifyObject(createLogFromError(error, subject))
   }
   notifyObject(object: LogObject) {
      log_objects.push(object)
      console.log(object)
   }
}

const log_dispatchers = new Set<ILogDispatcher>()
const log_objects: LogObject[] = []
let log_object_ids = 0

const default_log = new ConsoleLog()
registerLogCollector(default_log)

function generateLogId() {
   log_object_ids++
   return 'id-' + Date.now().toString(36) + '-' + log_object_ids.toString(2)
}

export function registerLogCollector(collector: ILogDispatcher) {
   log_dispatchers.add(collector)
}

export function unregisterLogCollector(collector: ILogDispatcher) {
   log_dispatchers.delete(collector)
}

export function queryLogCount(): number {
   return log_objects.length
}

export type QueryLogResult = {
   objects: LogObject[]
   hasMore: boolean
}

export function queryLogObjects(count: number, component_id?: string): QueryLogResult {
   const objects = []
   for (const obj of log_objects) {
      if (component_id === undefined || component_id === obj.component_id) {
         if (objects.length >= count) {
            return { objects, hasMore: true }
         }
         objects.push(obj)
      }
   }
   return { objects, hasMore: false }
}

export type LogInfos = {
   action_expected_count: number
   error_count: number
   warn_count: number
   notify_count: number
   info_count: number
}

export function queryLogInfos(component_id?: string): LogInfos {
   return log_objects.reduce((info, obj) => {
      if (component_id === undefined || component_id === obj.component_id) {
         switch (obj.kind) {
            case "error":
               info.error_count++
            case "warn":
               info.warn_count++
            case "notify":
               info.notify_count++
            case "info":
               info.info_count++
         }
      }
      return info
   }, {
      action_expected_count: 0,
      error_count: 0,
      warn_count: 0,
      notify_count: 0,
      info_count: 0,
   })
}

export const Log = {
   it(object: LogObject) {
      setTimeout(() => {
         for (const collector of log_dispatchers) {
            collector.notifyObject(object)
         }
      }, 0)
   },
   error(error: Error, subject?: any) {
      setTimeout(() => {
         for (const collector of log_dispatchers) {
            collector.notifyError(error, subject)
         }
      }, 0)
   },
   about(kind: LogKind, subject: any, message: string, options?: Partial<LogObject>) {
      setTimeout(() => {
         const object = {
            ...options,
            id: generateLogId(),
            kind,
            component_id: getComponentFromSubject(subject).id,
            message,
         }
         for (const collector of log_dispatchers) {
            collector.notifyObject(object)
         }
      }, 0)
   },
}

export function createLogFromError(error: Error, subject?: any): LogObject {
   return {
      id: generateLogId(),
      kind: "error",
      component_id: getComponentFromSubject(subject).id,
      message: error.message,
   }
}

export function getDefaultLogComponent() {
   return acquireComponent("log:application")
}

export function getComponentFromSubject(subject: any, is_static?: boolean): ComponentEntry {
   if (subject instanceof Object) {
      const target = ComponentsRegistry.datamap.get(subject) || subject
      if (target instanceof ComponentEntry) {
         return target
      }
      if (target instanceof ComponentResource) {
         return target.component
      }
      if (!is_static && subject["getSubjectUri"] instanceof Function) {
         return getComponentFromSubject(subject["getSubjectUri"](), true)
      }
   }
   return getDefaultLogComponent()
}

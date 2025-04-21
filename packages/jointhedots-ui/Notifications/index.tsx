import { useCallback, useEffect, useState } from "react"
import { IconButton } from "../Icon"
import { ILogDispatcher, LogInfos, LogObject, queryLogInfos, queryLogObjects, QueryLogResult, registerLogCollector, unregisterLogCollector } from "@jointhedots/core/logging"
import { usePanel } from "../Layouts"
import { ItemRowRich } from "../Items"
import { acquireComponent } from "@jointhedots/core/index"

class NotifObjectsCollector implements ILogDispatcher {
   constructor(
      readonly count: number,
      readonly dispatch: (result: QueryLogResult) => void,
   ) {
   }
   notifyError(error: Error, subject?: any) {
   }
   notifyObject(object: LogObject) {
      this.dispatch(queryLogObjects(this.count))
   }
}

class NotifCollector<T> implements ILogDispatcher {
   constructor(
      readonly evaluate: (object?: LogObject) => T,
      readonly dispatch: (result: T) => void,
   ) {
   }
   notifyError(error: Error, subject?: any) {
   }
   notifyObject(object: LogObject) {
      this.dispatch(this.evaluate(object))
   }
}

export function useNotificationObjects(count: number, subject_uri?: string): QueryLogResult {
   const [result, setResult] = useState(queryLogObjects(count, subject_uri))
   useEffect(() => {
      const collect = new NotifObjectsCollector(count, setResult)
      registerLogCollector(collect)
      return () => unregisterLogCollector(collect)
   }, [count])
   return result
}

export function useNotificationInfos(): LogInfos {
   return useNotifications(() => queryLogInfos())
}

export function useNotifications<T>(evaluate: (object?: LogObject) => T, deps?: any[]): T {
   const [result, setResult] = useState<T>(evaluate)
   useEffect(() => {
      const collect = new NotifCollector(evaluate, setResult)
      registerLogCollector(collect)
      return () => unregisterLogCollector(collect)
   }, deps)
   return result
}

export function NotificationsBell() {
   const infos = useNotificationInfos()
   const panel = usePanel(() => {
      return {
         icon: "bi:bell",
         title: "Notifications",
         content: <NotificationsList />,
      }
   })
   const onShow = useCallback((e) => {
      panel.isOpen ? panel.close() : panel.open("side")
   }, [])
   let bell = "bi:bell[info]"
   if (infos.error_count > 0) bell = "bi:bell-fill[error]"
   else if (infos.warn_count > 0) bell = "bi:bell-fill[warn]"
   return <IconButton name={bell} onClick={onShow} />
}

export function NotificationsList(props: {
   subject_uri?: string
}) {
   const { objects, hasMore } = useNotificationObjects(10, props.subject_uri)
   return <div>
      {objects.map((obj) => {
         return <Notification key={obj.id} object={obj} />
      })}
      {hasMore && <div>
         <IconButton name="bi:more" onClick={null} />
      </div>}
   </div>
}

export function Notification(props: {
   object: LogObject
}) {
   const { component_id, icon, title, message, actions } = props.object
   const comp = acquireComponent(component_id)
   const name = comp.get()?.title || title || component_id
   return <ItemRowRich
      icon={icon || getEventIcon(props.object)}
      name={name}
      summary={message}
      tooling={actions && actions.map(action => {
         return {
            icon: action.icon,
            name: action.title,
            summary: action.summary,
            onActivate: () => {
               console.log("do action:", component_id, action.scenario)
            }
         }
      })}
   />
}

function getEventIcon(object: LogObject) {
   if (object.kind === "error") {
      return object.icon ? object.icon + "|bi:exclamation-triangle-fill[error]" : "bi:exclamation-triangle-fill[error]"
   }
   else if (object.kind === "warn") {
      return object.icon ? object.icon + "|bi:exclamation-triangle-fill[warn]" : "bi:exclamation-triangle-fill[warn]"
   }
   else {
      return object.icon ? object.icon : "bi:info-circle-fill[info]"
   }
}
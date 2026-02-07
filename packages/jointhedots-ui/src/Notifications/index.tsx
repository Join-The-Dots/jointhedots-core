import { useCallback, useEffect, useState } from "react"
import {
   acquireComponent, ILogDispatcher, LogInfos, LogObject, queryLogInfos,
   queryLogObjects, QueryLogResult, registerLogCollector, unregisterLogCollector,
} from "@jointhedots/core"
import { Button, ButtonIcon } from "../Inputs"
import { usePanel } from "../Layouts"
import { ItemRowRich } from "../Items"
import { executeCommand } from "@jointhedots/core/commands"
import { EmptyListPlaceholder } from "../EmptyListPlaceholder"
import "./style.scss"

class NotifObjectsCollector implements ILogDispatcher {
   constructor(
      readonly count: number,
      readonly dispatch: (result: QueryLogResult) => void,
      readonly subject_uri?: string,
   ) {
      this.update()
   }
   notifyError(error: Error, subject?: any) {
   }
   notifyObject(object: LogObject) {
      this.update()
   }
   update() {
      this.dispatch(queryLogObjects(this.count, this.subject_uri))
   }
}

class NotifCollector<T> implements ILogDispatcher {
   constructor(
      readonly evaluate: (object?: LogObject) => T,
      readonly dispatch: (result: T) => void,
   ) {
      this.dispatch(this.evaluate())
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
      const collect = new NotifObjectsCollector(count, setResult, subject_uri)
      registerLogCollector(collect)
      return () => unregisterLogCollector(collect)
   }, [count, subject_uri])
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
   }, deps || [])
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
   return <ButtonIcon icon={bell} size="1.3em" onClick={onShow} />
}


/**
 * NotificationSection component
 * Renders a section of notifications with a title and content
 */
function NotificationSection(props: {
   title: string
   items: React.ReactNode[]
   emptyMessage: string
   emptyIcon: string
}) {
   const { title, items, emptyMessage, emptyIcon } = props

   return (
      <section className="notifications-section">
         <div className="section-header">
            <h2>{title}</h2>
            {items.length > 0 && <span className="count">{items.length}</span>}
         </div>

         <div className="section-content">
            {items.length > 0 ? (
               <div className="notification-items">{items}</div>
            ) : (
               <EmptyListPlaceholder
                  message={emptyMessage}
                  icon={emptyIcon}
               />
            )}
         </div>
      </section>
   )
}

export function NotificationsList(props: {
   subject_uri?: string
}) {
   const [count, setCount] = useState(10)
   const { objects, hasMore } = useNotificationObjects(count, props.subject_uri)
   const tickets = []
   const events = []

   for (const obj of objects) {
      if (obj.kind === "ticket") {
         tickets.push(<Notification key={obj.id} object={obj} />)
      }
      else {
         events.push(<Notification key={obj.id} object={obj} />)
      }
   }

   return (
      <div className="notifications-list">
         <NotificationSection
            title="Tickets"
            items={tickets}
            emptyMessage="No issues to display"
            emptyIcon="bi:exclamation-triangle"
         />

         <NotificationSection
            title="Events"
            items={events}
            emptyMessage="No events to display"
            emptyIcon="bi:calendar-event"
         />

         {hasMore && <Button
            icon="bi:more"
            label="Load more"
            onClick={() => setCount(count + 10)}
         />}
      </div>
   )
}

export function Notification(props: {
   object: LogObject
}) {
   const { component_id, icon, title, message, actions } = props.object
   const comp = acquireComponent(component_id)
   const name = comp.manifest?.title || title || component_id
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
               executeCommand(action)
            }
         }
      })}
   />
}

function getEventIcon(object: LogObject) {
   if (object.status === "error") {
      return object.icon ? object.icon + "|bi:exclamation-triangle-fill[error]" : "bi:exclamation-triangle-fill[error]"
   }
   else if (object.status === "warn") {
      return object.icon ? object.icon + "|bi:exclamation-triangle-fill[warn]" : "bi:exclamation-triangle-fill[warn]"
   }
   else {
      return object.icon ? object.icon : "bi:info-circle-fill[info]"
   }
}

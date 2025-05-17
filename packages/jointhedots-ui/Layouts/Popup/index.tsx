import { usePanel } from "../Panels"
import { createFloatingDock } from "../Panels/FloatingDock"

export function Popup<D = unknown>(props: {
   content: React.ReactNode | ((data: D) => Promise<React.ReactNode> | React.ReactNode)
   data?: D
   children: React.ReactNode
}) {
   const { content, data, children } = props
   const panel = usePanel(async () => {
      return {
         content: content instanceof Function ? await content(data) : content
      }
   }, [data, content])
   return <div
      onMouseEnter={(e) => panel.open(createFloatingDock(e))}
      onMouseLeave={() => panel.close()}
   >
      {children}
   </div>
}

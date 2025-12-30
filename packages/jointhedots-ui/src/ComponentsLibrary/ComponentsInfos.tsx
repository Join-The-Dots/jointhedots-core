import { acquireComponent, EditorKey, ComponentPublication } from "@jointhedots/core"
import { NotificationsList } from "../Notifications"
import { useAsyncMemo } from "@jointhedots/core/react"
import { Spinner } from "@salesforce/design-system-react"


export function ComponentCard(props: {
   entry: ComponentPublication
}) {
   const { entry } = props
   const infos = useAsyncMemo(async () => {
      const comp = acquireComponent(entry.component_id)
      const manifest = await comp.fetch()
      const editor = await EditorKey.fetch(comp)
      return {
         manifest,
         preview: editor?.preview,
      }

   }, undefined, [entry])
   return <>
      {infos !== undefined ? <>
         {infos.preview && <infos.preview manifest={infos.manifest} />}
      </> : <Spinner />
      }
   </>
}

export function ComponentInfos(props: {
   entry: ComponentPublication
}) {
   const { entry } = props
   return <>
      <ComponentCard entry={entry} />
      <NotificationsList subject_uri={entry.component_id} />
   </>
}
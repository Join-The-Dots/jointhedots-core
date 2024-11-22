import { MonacoEditorHOC, StandardLanguageProvider } from "@sf-explorer/editors/ui/MonacoEditorHOC"

export const EditorSOQL = MonacoEditorHOC(new StandardLanguageProvider<void>("apex"))

export type SOQLComponentProps = Readonly<{
  code: string
}>

export function SOQLComponent({
  code,
}: SOQLComponentProps) {
  return (<div style={{ padding: 10 }}>
    <EditorSOQL value={code} />
  </div>)
}

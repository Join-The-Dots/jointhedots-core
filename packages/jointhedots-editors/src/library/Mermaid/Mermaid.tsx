import Mermaid from "mermaid"
import { useEffect, useMemo, useState } from "react"

export type MermaidComponentProps = Readonly<{
  code: string
}>

let ids = 0
export function MermaidComponent({
  code,
}: MermaidComponentProps) {
  const [content, setContent] = useState("")
  const domid = useMemo(() => "mermaid_" + (ids++), [])
  useEffect(() => {
    console.log("MermaidComponent", code)
    Mermaid.render(domid, code || "").then(({ svg }) => {
      setContent(svg)
    }, (e) => {
      console.error(e)
      setContent("[Invalid mermaid code]")
    })
  }, [code])
  return (<div dangerouslySetInnerHTML={{ __html: content }} />)
}

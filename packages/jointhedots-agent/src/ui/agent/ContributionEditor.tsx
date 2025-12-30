import React, { useState } from "react"
import { GenerativeThread } from "../../ai/thread/GenerativeThread.ts"

export interface ContributionEditorProps {
   flow: GenerativeThread
   user?: string
   placeholder?: string
   autoReply?: boolean // automatically queue assistant reply generation
   className?: string
   style?: React.CSSProperties
}

export const ContributionEditor: React.FC<ContributionEditorProps> = ({
   flow,
   user = "user",
   placeholder = "Type a message…",
   autoReply = true,
   className,
   style,
}) => {
   const [value, setValue] = useState("")
   const [busy, setBusy] = useState(false)

   async function send() {
      const text = value.trim()
      if (!text || busy) return
      setBusy(true)
      // Immediate user message (completed)
      flow.notify({
         user,
         content: [{ type: "Text", text }],
      })
      setValue("")
      if (autoReply) {
         // Schedule assistant generation
         flow.contribute({ user: "assistant" })
      }
      // Brief delay to show sending state
      setTimeout(() => setBusy(false), 150)
   }

   function onKey(e: React.KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
         e.preventDefault()
         send()
      }
   }

   return (
      <div className={"flow-editor " + (className || "")} style={{ display: "flex", gap: 8, ...style }}>
         <textarea
            value={value}
            disabled={busy}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            style={{
               flex: 1,
               resize: "vertical",
               minHeight: 46,
               padding: 8,
               fontFamily: "system-ui, sans-serif",
               fontSize: 14,
               background: "var(--editor-bg)",
               color: "var(--text-color)",
               border: "1px solid var(--border-color)"
            }}
         />
         <button
            onClick={send}
            disabled={busy || value.trim().length === 0}
            style={{
               padding: "0 16px",
               background: "var(--user-bg)",
               color: "var(--text-color)",
               border: "1px solid var(--border-color)",
               borderRadius: 6
            }}
         >
            Send
         </button>
      </div>
   )
}

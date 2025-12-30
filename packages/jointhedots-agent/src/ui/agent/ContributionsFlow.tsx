import React, { useEffect, useRef, useState } from "react"
import { GenerativeThread, ContributionStatus, Contribution } from "../../ai/thread/GenerativeThread.ts"

// Individual contribution item component
interface ContributionItemProps {
  cn: Contribution
}

export const ContributionItem: React.FC<ContributionItemProps> = ({ cn }) => {
  const text = contributionText(cn) || (cn.status === ContributionStatus.Working ? "…" : "")
  const isUser = cn.user !== "assistant"
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-start" : "flex-end",
      marginBottom: 8,
      fontFamily: "system-ui, sans-serif"
    }}>
      <div style={{ fontSize: 11, opacity: 0.6 }}>
        {cn.user} · {statusLabel(cn.status)}
      </div>
      <div style={{
        background: isUser ? "var(--user-bg)" : "var(--assistant-bg)",
        border: "1px solid var(--border-color)",
        padding: "6px 10px",
        borderRadius: 8,
        maxWidth: 520,
        whiteSpace: "pre-wrap",
        fontSize: 14,
        minHeight: 18,
        color: "var(--text-color)"
      }}>{text}</div>
    </div>
  )
}

// Helper to extract plain text from a BlockContent
function contributionText(cn: Contribution): string {
  if (!cn?.content) return ""
  // content is an array of primitives – we only care about text primitives for now
  return cn.content
    .filter((p: any) => p && p.type === "text" && typeof p.text === "string")
    .map((p: any) => p.text)
    .join("\n")
}

function statusLabel(s: ContributionStatus): string {
  switch (s) {
    case ContributionStatus.Pending: return "pending"
    case ContributionStatus.Working: return "working"
    case ContributionStatus.Done: return "done"
    case ContributionStatus.Failed: return "failed"
    default: return String(s)
  }
}

// Lightweight polling hook because GenerationFlow has no change events yet.
function useFlow(flow: GenerativeThread, interval = 400) {
  const [, setVersion] = useState(0)
  useEffect(() => {
    let lastSignature = ""
    const id = setInterval(() => {
      const sig = flow.thread.map(c => `${c.index}:${c.status}:${c.content?.length}` ).join("|")
      if (sig !== lastSignature) {
        lastSignature = sig
        setVersion(v => v + 1)
      }
    }, interval)
    return () => clearInterval(id)
  }, [flow, interval])
  return flow.thread
}

export interface FlowContributionsProps {
  flow: GenerativeThread
  className?: string
  style?: React.CSSProperties
}

export const ContributionsFlow: React.FC<FlowContributionsProps> = ({ flow, className, style }) => {
  const contributions = useFlow(flow)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [contributions.length])

  return (
    <div className={"flow-thread " + (className || "")} style={{ overflowY: "auto", padding: 8, ...style }}>
      {contributions.map(cn => (
        <ContributionItem key={cn.index} cn={cn} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

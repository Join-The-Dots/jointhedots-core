import { LDXDocumentExpr } from "@jointhedots/core"
import { createContext, useContext } from "react"

export const DocumentContext = createContext<LDXDocumentExpr>(null);

export function useDocumentContext() {
   return useContext(DocumentContext)
}
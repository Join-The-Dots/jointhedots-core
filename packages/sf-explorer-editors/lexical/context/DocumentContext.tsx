import { LDXDocumentExpr } from "@sf-explorer/core"
import { createContext, useContext } from "react"

export const DocumentContext = createContext<LDXDocumentExpr>(null);

export function useDocumentContext() {
   return useContext(DocumentContext)
}
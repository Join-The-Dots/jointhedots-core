import React, { useMemo, useState, useEffect, useCallback, useRef } from "react"
import { createOpenAIGenerativeService } from "../../ai/providers/openai-gen-thread.ts"
import { GenerativeThread } from "../../ai/thread/GenerativeThread.ts"
import { ContributionsFlow } from "./ContributionsFlow.tsx"
import { ContributionEditor } from "./ContributionEditor.tsx"
import { ConversationStorage, type StoredConversation } from "../utils/conversationStorage.ts"
import { ThemeToggle } from "../components/ThemeToggle.tsx"
import "../styles/theme.css"
import { ShowGraph } from "./ContributionsGraph.tsx"

// Simple Chat wrapper creating a GenerationFlow and exposing UI
export const Chat: React.FC<{ apiKey?: string }> = ({ apiKey }) => {
   const [viewMode, setViewMode] = useState<"chat" | "graph">("graph")
   const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
   const [conversationName, setConversationName] = useState<string>("")
   const [showConversationList, setShowConversationList] = useState(false)
   const [conversations, setConversations] = useState<StoredConversation[]>([])
   const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
   const conversationListRef = useRef<HTMLDivElement>(null)

   const generativeSession = useMemo(() => {
      const key = apiKey || (import.meta as any).env?.VITE_OPENAI_APIKEY || (window as any).OPENAI_APIKEY
      if (!key) {
         console.warn("No OpenAI API key provided. Set VITE_OPENAI_APIKEY or window.OPENAI_APIKEY for live generation.")
      }
      const svc = createOpenAIGenerativeService(key || "missing-key")
      return svc.createGenerativeSession()
   }, [apiKey])

   const [flow, setFlow] = useState<GenerativeThread>(() => new GenerativeThread(generativeSession))

   // Load conversations on mount
   useEffect(() => {
      const loadedConversations = ConversationStorage.getConversationList()
      setConversations(loadedConversations)

      // Try to load current conversation
      const currentId = ConversationStorage.getCurrentConversationId()
      if (currentId) {
         const loadedFlow = ConversationStorage.loadConversation(currentId, generativeSession)
         if (loadedFlow) {
            setFlow(loadedFlow)
            setCurrentConversationId(currentId)
            const conversation = loadedConversations.find(c => c.id === currentId)
            setConversationName(conversation?.name || "")
         }
      }
   }, [generativeSession])

   // Auto-save functionality
   const scheduleAutoSave = useCallback(() => {
      if (autoSaveTimeoutRef.current) {
         clearTimeout(autoSaveTimeoutRef.current)
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
         if (flow.thread.length > 0) {
            const id = ConversationStorage.saveConversation(flow, currentConversationId || undefined)
            if (!currentConversationId) {
               setCurrentConversationId(id)
               setConversationName(ConversationStorage.generateName(flow))
            }
            // Refresh conversation list
            setConversations(ConversationStorage.getConversationList())
         }
      }, 2000) // Auto-save after 2 seconds of inactivity
   }, [flow, currentConversationId])

   // Trigger auto-save when flow changes
   useEffect(() => {
      scheduleAutoSave()
      return () => {
         if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
         }
      }
   }, [scheduleAutoSave])

   // Close conversation list when clicking outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (conversationListRef.current && !conversationListRef.current.contains(event.target as Node)) {
            setShowConversationList(false)
         }
      }

      if (showConversationList) {
         document.addEventListener('mousedown', handleClickOutside)
         return () => document.removeEventListener('mousedown', handleClickOutside)
      }
   }, [showConversationList])



   // Conversation management functions
   const createNewConversation = useCallback(() => {
      const newFlow = new GenerativeThread(generativeSession)
      setFlow(newFlow)
      setCurrentConversationId(null)
      setConversationName("")
      ConversationStorage.clearCurrentConversation()
   }, [generativeSession])

   const loadConversation = useCallback((id: string) => {
      const loadedFlow = ConversationStorage.loadConversation(id, generativeSession)
      if (loadedFlow) {
         setFlow(loadedFlow)
         setCurrentConversationId(id)
         ConversationStorage.setCurrentConversationId(id)
         const conversation = conversations.find(c => c.id === id)
         setConversationName(conversation?.name || "")
         setShowConversationList(false)
      }
   }, [generativeSession, conversations])

   const deleteConversation = useCallback((id: string) => {
      ConversationStorage.deleteConversation(id)
      setConversations(ConversationStorage.getConversationList())

      // If we deleted the current conversation, create a new one
      if (currentConversationId === id) {
         createNewConversation()
      }
   }, [currentConversationId, createNewConversation])

   const saveCurrentConversation = useCallback(() => {
      if (flow.thread.length > 0) {
         const name = conversationName || ConversationStorage.generateName(flow)
         const id = ConversationStorage.saveConversation(flow, currentConversationId || undefined, name)
         if (!currentConversationId) {
            setCurrentConversationId(id)
         }
         setConversationName(name)
         setConversations(ConversationStorage.getConversationList())
      }
   }, [flow, currentConversationId, conversationName])

   const renderMainContent = () => {
      switch (viewMode) {
         case "graph":
            return (
               <div style={{
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  gap: 0,
                  overflow: "hidden"
               }}>
                  <div style={{
                     flex: 1,
                     height: "100%",
                     overflow: "auto"
                  }}>
                     <ShowGraph flow={flow} />
                  </div>
               </div>
            )
         default: // "chat"
            return <ContributionsFlow flow={flow} style={{
               width: "100%",
               height: "100%",
               overflow: "auto"
            }} />
      }
   }

   return (
      <div className="chat-container" style={{
         height: "100vh",
         display: "flex",
         flexDirection: "column",
         overflow: "hidden"
      }}>
         {/* Header with conversation management and view mode toggle */}
         <div className="chat-header" style={{
            flexShrink: 0,
            borderBottom: "1px solid var(--border-color)",
            padding: "8px 16px",
            backgroundColor: "var(--bg-secondary)"
         }}>
            {/* Conversation management */}
            <div className="conversation-controls">
               <button
                  onClick={createNewConversation}
                  className="btn compact"
                  title="New Conversation"
               >
                  New
               </button>

               <div className="conversation-list-container">
                  <button
                     onClick={() => setShowConversationList(!showConversationList)}
                     className="btn compact"
                     title="Load Conversation"
                  >
                     Load ({conversations.length})
                  </button>

                  {showConversationList && (
                     <div ref={conversationListRef} className="conversation-dropdown">
                        {conversations.length === 0 ? (
                           <div className="conversation-empty">
                              No saved conversations
                           </div>
                        ) : (
                           conversations.map(conversation => (
                              <div
                                 key={conversation.id}
                                 className={`conversation-item ${currentConversationId === conversation.id ? 'active' : ''}`}
                                 onClick={() => loadConversation(conversation.id)}
                              >
                                 <div className="conversation-item-content">
                                    <div className="conversation-name">
                                       {conversation.name}
                                    </div>
                                    <div className="conversation-date">
                                       {new Date(conversation.updatedAt).toLocaleString()}
                                    </div>
                                 </div>
                                 <button
                                    onClick={(e) => {
                                       e.stopPropagation()
                                       deleteConversation(conversation.id)
                                    }}
                                    className="btn danger"
                                    title="Delete Conversation"
                                 >
                                    ×
                                 </button>
                              </div>
                           ))
                        )}
                     </div>
                  )}
               </div>

               <button
                  onClick={saveCurrentConversation}
                  className="btn compact"
                  title="Save Conversation"
               >
                  Save
               </button>

               {conversationName && (
                  <span className="current-conversation-name">
                     {conversationName}
                  </span>
               )}
            </div>

            {/* View mode toggle and theme toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
               <div className="view-mode-controls">
                  <button
                     onClick={() => setViewMode("chat")}
                     className={`btn ${viewMode === "chat" ? "primary" : ""}`}
                  >
                     Chat View
                  </button>
                  <button
                     onClick={() => setViewMode("graph")}
                     className={`btn ${viewMode === "graph" ? "primary" : ""}`}
                  >
                     Graph View
                  </button>
               </div>

               <ThemeToggle />
            </div>
         </div>

         {renderMainContent()}

         <div className="chat-input" style={{
            flexShrink: 0,
            borderTop: "1px solid var(--border-color)",
            padding: "8px 16px",
            backgroundColor: "var(--bg-secondary)"
         }}>
            <ContributionEditor flow={flow} />
         </div>
      </div>
   )
}

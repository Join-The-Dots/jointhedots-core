import { GenerativeThread, serializeGenerationFlow, deserializeGenerationFlow } from "../../ai/thread/GenerativeThread.ts"
import { type GenerationSession } from "../../ai/thread/GenerativeService.ts"

export interface StoredConversation {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  data: string
}

const CONVERSATIONS_STORAGE_KEY = "llm-agent-conversations"
const CURRENT_CONVERSATION_KEY = "llm-agent-current-conversation"

export class ConversationStorage {
  
  static generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static generateName(flow: GenerativeThread): string {
    // Try to extract a meaningful name from the first few contributions
    const firstContributions = flow.thread
      .filter(c => c.content && c.user === "user1")
      .slice(0, 2)

    if (firstContributions.length > 0) {
      const firstText = firstContributions[0].content
      if (firstText && Array.isArray(firstText) && firstText.length > 0) {
        const textPrimitive = firstText.find(p => p.type === "Text")
        if (textPrimitive && "text" in textPrimitive) {
          const text = textPrimitive.text.trim()
          // Extract first meaningful words, limit to reasonable length
          const words = text.split(/\s+/).slice(0, 5)
          const name = words.join(" ")
          return name.length > 50 ? name.substring(0, 47) + "..." : name
        }
      }
    }

    return `Conversation ${new Date().toLocaleDateString()}`
  }

  static saveConversation(flow: GenerativeThread, id?: string, name?: string): string {
    const conversations = this.getAllConversations()
    const conversationId = id || this.generateId()
    const conversationName = name || this.generateName(flow)
    const now = new Date().toISOString()

    const storedConversation: StoredConversation = {
      id: conversationId,
      name: conversationName,
      createdAt: conversations[conversationId]?.createdAt || now,
      updatedAt: now,
      data: serializeGenerationFlow(flow)
    }

    conversations[conversationId] = storedConversation
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations))
    
    // Set as current conversation
    localStorage.setItem(CURRENT_CONVERSATION_KEY, conversationId)
    
    return conversationId
  }

  static loadConversation(id: string, defaultGenerator: GenerationSession): GenerativeThread | null {
    const conversations = this.getAllConversations()
    const storedConversation = conversations[id]
    
    if (!storedConversation) {
      return null
    }

    try {
      return deserializeGenerationFlow(storedConversation.data, defaultGenerator)
    } catch (error) {
      console.error("Failed to deserialize conversation:", error)
      return null
    }
  }

  static getAllConversations(): Record<string, StoredConversation> {
    const stored = localStorage.getItem(CONVERSATIONS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  }

  static getConversationList(): StoredConversation[] {
    const conversations = this.getAllConversations()
    return Object.values(conversations).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  static deleteConversation(id: string): void {
    const conversations = this.getAllConversations()
    delete conversations[id]
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations))
    
    // Clear current conversation if it was deleted
    if (localStorage.getItem(CURRENT_CONVERSATION_KEY) === id) {
      localStorage.removeItem(CURRENT_CONVERSATION_KEY)
    }
  }

  static getCurrentConversationId(): string | null {
    return localStorage.getItem(CURRENT_CONVERSATION_KEY)
  }

  static setCurrentConversationId(id: string): void {
    localStorage.setItem(CURRENT_CONVERSATION_KEY, id)
  }

  static clearCurrentConversation(): void {
    localStorage.removeItem(CURRENT_CONVERSATION_KEY)
  }
}
import { ServiceEntry } from "../library/components"

export enum LangQuality {
   High,
   Medium,
   Low,
}

export type LangOptions = {
   quality?: LangQuality
   maxLength?: number
   temperature?: number
   topP?: number
}

export type LangContent = string | Blob

export enum ChatRole {
   System = "system",
   User = "user",
   Agent = "agent",
}

export type ChatMessage = {
   role: ChatRole
   content: LangContent | LangContent[]
}

export interface LanguageService {
   queryConversation(messages: ChatMessage[], opts?: LangOptions): Promise<ChatMessage>
   queryCompletion(text: LangContent, opts?: LangOptions): Promise<string>
}

export type LanguageDescriptor = void

export const LanguageServiceKey = new ServiceEntry<LanguageService, LanguageDescriptor>("language")


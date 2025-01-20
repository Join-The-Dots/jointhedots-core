import { WebAPIService } from "@sf-explorer/core/services/WebAPI"
import { ServiceType, ServiceInterface } from "@sf-explorer/core/library/services"
import { ChatMessage, LangContent, LangOptions, LanguageService } from "@sf-explorer/core/services/Language"
import { ComponentManifest } from "@sf-explorer/core"

type OpenAISettings = {

}

export class OpenAIAccount {
   apiKey = localStorage.getItem('chatGPTKey') || ''
   constructor(readonly name: string, public settings: OpenAISettings) {
   }
   getAvailableServices(): ServiceType[] {
      return ["Language"]
   }
   getService(type: ServiceType): ServiceInterface {
      switch (type) {
         case "Language": return new OpenAILanguageService(this) as any
      }
      return null
   }
   update(descriptor: ComponentManifest) {
      const { settings } = descriptor
      this.apiKey = settings.apiKey
      return this
   }
   async check(): Promise<void> {
   }
}

const URL = 'https://api.openai.com/v1/chat/completions'
const URLCode = 'https://api.openai.com/v1/completions'

class OpenAILanguageService implements LanguageService, WebAPIService {
   constructor(readonly account: OpenAIAccount) {
   }
   async queryConversation(messages: ChatMessage[], opts?: LangOptions): Promise<ChatMessage> {
      const res = await this.fetch(URLCode, {
         model: "text-davinci-003",
         prompt: messages.map(m => ({
            role: m.role,
         })),
         temperature: opts.temperature | 0,
         max_tokens: opts.maxLength | 350,
         top_p: opts.topP | 1.0,
         frequency_penalty: 0.0,
         presence_penalty: 0.0,
         stop: ["\"\"\""],
      })
      return JSON.parse(await res.text())
   }
   async queryCompletion(text: LangContent, opts?: LangOptions): Promise<string> {
      const res = await this.fetch(URLCode, {
         model: "text-davinci-003",
         prompt: text,
         temperature: opts.temperature | 0,
         max_tokens: opts.maxLength | 350,
         top_p: opts.topP | 1.0,
         frequency_penalty: 0.0,
         presence_penalty: 0.0,
         stop: ["\"\"\""],
      })
      return res.text()
   }
   async fetch(url: string, data?: Blob | any, method?: string): Promise<Blob> {
      const { apiKey } = this.account
      const res = await fetch(url, {
         method: 'POST',
         headers: {
            "Content-Type": data.type,
            "Authorization": "Bearer " + apiKey
         },
         body: data,
      })
      return res.blob()
   }
   async getSchema(path: string) {
      return null
   }
}

function fetchOptions(model, query) {
   if (model === 'code') {
      return {
         model: "text-davinci-003",
         prompt: query,
         temperature: 0,
         max_tokens: 350,
         top_p: 1.0,
         frequency_penalty: 0.0,
         presence_penalty: 0.0,
         stop: ["\"\"\""],
      }
   }
   return {
      model: "gpt-4o-mini",
      //  "response_format": {"type": "json_object"},
      messages: [{ "role": "user", "content": query }],
      // temperature: 0.7,
   }
}

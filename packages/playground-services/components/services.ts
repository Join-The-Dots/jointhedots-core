import { createServicePoint } from "@jointhedots/core"
import { LanguageServiceKey, StorageServiceKey } from "@jointhedots/core/services"

export const LanguageLLM = createServicePoint(LanguageServiceKey, "standard", {
    title: "Language LLM",
})

export const CodeLLM = createServicePoint(LanguageServiceKey, "code", {
    title: "Code LLM",
    alternative: LanguageLLM.id,
})

export const CodeStorage = createServicePoint(StorageServiceKey, "code", {
    title: "Code Storage",
})


export const DeliveryOrgsPoint = createServicePoint(StorageServiceKey, "orgs-delivery", {
    title: "Orgs code delivery target",
})

export const SourceOrgsPoint = createServicePoint(StorageServiceKey, "sources", {
    title: "Orgs code source",
    multiple: true,
})

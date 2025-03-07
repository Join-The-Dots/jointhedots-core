import { createServiceGroup, createServicePoint } from "@jointhedots/core"
import { LanguageService, StorageService } from "@jointhedots/core/services"

export const LanguageLLM = createServicePoint<LanguageService>("Language LLM", "language")
export const CodeLLM = createServicePoint<LanguageService>("Code LLM", "language")

export const CodeStorage = createServicePoint<StorageService>("Code Storage", "storage")


export const DeliveryOrgsPoint = createServiceGroup<StorageService>("Delivery Orgs", "storage")
export const SourceOrgsPoint = createServiceGroup<StorageService>("Source Orgs", "storage")

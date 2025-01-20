import { createServiceGroup, createServicePoint } from "@sf-explorer/core/library/services"
import { LanguageService } from "typescript"
import { StorageService } from "@sf-explorer/core/services/Storage"

export const LanguageLLM = createServicePoint<LanguageService>("Language LLM", "language")
export const CodeLLM = createServicePoint<LanguageService>("Code LLM", "language")

export const CodeStorage = createServicePoint<StorageService>("Code Storage", "storage")


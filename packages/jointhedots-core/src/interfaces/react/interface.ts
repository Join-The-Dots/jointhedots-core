import { z, type ZodObject, type ZodRawShape } from "zod"
import { type ServiceDefinition, type ServiceInterface } from "../../services"
import { ViewServiceKey } from "../view/interface"
import React from "react"

export type ViewServicePoint = {
   service?: string
   cardinality?: number
}

export type ViewRequirements = {
   servicePoints?: Record<string, ViewServicePoint>
}

/**
 * Creates a ServiceDefinition for a React view component with typed props.
 * 
 * This factory function generates a service definition that can be used to register
 * React components within the service system. It provides type-safe props validation
 * using Zod schemas and supports dependency injection through service points.
 * 
 * @param props - Optional Zod schema defining the component's props structure.
 *                If not provided, defaults to a record accepting any string keys.
 * @returns A ServiceDefinition specialized for React view components
 * 
 * @example
 * ```typescript
 * // Define a component with typed props
 * const UserCardSchema = ReactComponentSchema(z.object({
 *   userId: z.string(),
 *   showAvatar: z.boolean().optional(),
 * }))
 * 
 * // Use in component registration
 * const UserCard: ReactComponentType<typeof UserCardSchema> = ({ userId, showAvatar }) => {
 *   return <div>{userId}</div>
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Define a component with service requirements
 * const DashboardSchema = ReactComponentSchema(z.object({
 *   title: z.string(),
 * }))
 * 
 * // Component descriptor with service points
 * const descriptor: ReactComponentDescriptor = {
 *   props: { title: "My Dashboard" },
 *   requirements: {
 *     servicePoints: {
 *       dataService: { service: "spec://data-provider", cardinality: 1 },
 *     },
 *   },
 * }
 * ```
 */
export function ReactComponentSchema<T extends ZodRawShape>(props?: ZodObject<T>) {
   const propsSchema = props || z.record(z.string(), z.any())
   return {
      $spec: "spec://jointhedots.org/view.react",
      version: "0.0",
      properties: z.object({
         props: propsSchema,
         requirements: z.object({
            servicePoints: z.record(z.string(), z.object({
               service: z.string().optional(),
               cardinality: z.number().optional(),
            })).optional(),
         }).optional(),
      }),
      isAssignable(from) {
         return from.$spec = this.$spec
      }
   } as ServiceDefinition<z.infer<typeof propsSchema>, ReactComponentDescriptor<T>>
}

/**
 * Type alias for React components that integrate with the service system.
 * 
 * Components of this type receive their props through `ServiceInterface<T>`,
 * which provides both the declared props and access to injected services.
 * 
 * @template T - The props type, typically inferred from a Zod schema
 * 
 * @example
 * ```typescript
 * const MyComponent: ReactComponentType<{ name: string }> = (props) => {
 *   return <span>Hello, {props.name}!</span>
 * }
 * ```
 */
export type ReactComponentType<T = {}> = React.ComponentType<ServiceInterface<T>>

/**
 * Descriptor object for configuring a React component within the service system.
 * 
 * This type defines the structure for declaring component properties and
 * service dependencies that will be injected at runtime.
 * 
 * @template T - Zod shape type for props validation
 * 
 * @property props - Initial props values matching the component's schema
 * @property requirements - Service injection configuration
 * @property requirements.servicePoints - Map of named service injection points,
 *           each specifying the service spec URI and optional cardinality
 * 
 * @example
 * ```typescript
 * const descriptor: ReactComponentDescriptor<{ count: z.ZodNumber }> = {
 *   props: { count: 0 },
 *   requirements: {
 *     servicePoints: {
 *       counter: { service: "spec://counter-service", cardinality: 1 },
 *       logger: { service: "spec://logger" },
 *     },
 *   },
 * }
 * ```
 */
export type ReactComponentDescriptor<T extends ZodRawShape = ZodRawShape> = {
   props?: z.infer<ZodObject<T>>
   requirements?: ViewRequirements
}

// Service "view.react"
export type ViewReactService<T = any> = React.ComponentType<T>
export const ViewReactKey = ViewServiceKey.subservice<ViewReactService>("react")

// Service "view.webc"
export type ViewWebComponentService = new (...props) => HTMLElement
export const ViewWebComponentKey = ViewServiceKey.subservice<ViewWebComponentService>("webc")

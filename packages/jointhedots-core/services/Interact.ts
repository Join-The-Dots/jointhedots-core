import { MapLike } from "packages/jointhedots-gear/src/utils/helpers"
import { ServiceEntry } from "../library/components"

export interface InteractService {
   interact(scenario: string, params?: MapLike<any>): Promise<any>
}

export type InteractDescriptor = void

export const InteractServiceKey = new ServiceEntry<InteractService, InteractDescriptor>("interact")

import { PackageManager } from "./PackageManager.mjs"

// Publish packages
PackageManager.add("packages/jointhedots-core")
PackageManager.add("packages/jointhedots-ui")
PackageManager.add("packages/jointhedots-scripting")

PackageManager.publish()

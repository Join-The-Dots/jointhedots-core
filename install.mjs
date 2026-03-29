import { PackageManager } from "./PackageManager.mjs"

// Install packages
//PackageManager.add("packages/jointhedots-cortex", "https://github.com/Join-The-Dots/jointhedots-cortex.git")
PackageManager.add("packages/jointhedots-core")
PackageManager.add("packages/jointhedots-scripting")
PackageManager.add("packages/jointhedots-ui")

// Install playgrounds
PackageManager.add("playgrounds/playground-ui")

PackageManager.install()

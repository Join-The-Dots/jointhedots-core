import { command, directory } from "@polycuber/script.cli"
import { dirname } from "node:path"

function installPackage(path, url) {
   if (!directory.exists(path) && url) command.exec(`git clone ${url}`, { cwd: dirname(path) })
   else if (url) command.exec(`git pull`, { cwd: path, ignoreError: true })
   else if (!directory.exists(path)) throw `Package '${path}'not found`
   command.exec("pnpm install --force", { cwd: path })
   command.exec("pnpm run build", { cwd: path, ignoreError: true })
}

// Install packages
//installPackage("packages/jointhedots-cortex", "https://github.com/Join-The-Dots/jointhedots-cortex.git")
installPackage("packages/jointhedots-core")
installPackage("packages/jointhedots-scripting")
installPackage("packages/jointhedots-ui")
//installPackage("packages/jointhedots-agent")
//installPackage("packages/jointhedots-editors")

// Install playgrounds
installPackage("playgrounds/playground-ui")

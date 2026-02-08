import { command, directory } from "@polycuber/script.cli"
import { dirname } from "node:path"

function publishPackage(path, url) {
   if (!directory.exists(path) && url) command.exec(`git clone ${url}`, { cwd: dirname(path) })
   else if (url) command.exec(`git pull`, { cwd: path, ignoreError: true })
   else if (!directory.exists(path)) throw `Package '${path}'not found`
   command.exec("npm run deliver", { cwd: path })
}

// Publish packages
publishPackage("packages/jointhedots-core")
publishPackage("packages/jointhedots-ui")


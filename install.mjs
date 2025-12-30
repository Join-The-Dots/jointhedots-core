import { command } from "@polycuber/script.cli"

command.exec("npm install", { cwd: "packages/jointhedots-core" })
command.exec("npm run build", { cwd: "packages/jointhedots-core", ignoreError: true })

command.exec("npm install", { cwd: "packages/jointhedots-ui" })
command.exec("npm run build", { cwd: "packages/jointhedots-ui", ignoreError: true })

command.exec("npm install", { cwd: "packages/playground-ui" })
command.exec("npm run build", { cwd: "packages/playground-ui", ignoreError: true })

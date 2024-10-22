#!/usr/bin/env node
import "source-map-support"
import Process from "node:process"
import Yargs from "yargs"
import { hideBin } from 'yargs/helpers'
import { command_build, command_serve } from "./esbuild.js"
import { command_publish } from './publish.js'
import { command_run } from "./run.js"

function command_fail() {
   return {
      command: '*',
      handler: async (argv) => {
         throw "Error: Invalid command"
      }
   }
}
console.log(Process.argv)
Yargs(hideBin(Process.argv)).scriptName("explorer-gear")
   .command(command_build())
   .command(command_serve())
   .command(command_publish())
   .command(command_run())
   .command(command_fail())
   .showHelpOnFail(true)
   .help()
   .parse()

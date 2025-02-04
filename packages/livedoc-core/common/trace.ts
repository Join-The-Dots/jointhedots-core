

const visibles = {
   "!flow": false,
   "build": false,
   "flow": false,
   "pipe": false,
   "rest": false,
}

export function trace(kind: string, ...infos: any[]) {
   if (visibles[kind] === false) return

   if (kind.startsWith("!")) {
      console.warn(`[${kind.slice(1)}]`, ...infos)
   }
   else {
      console.log(`[${kind}]`, ...infos)
   }
}

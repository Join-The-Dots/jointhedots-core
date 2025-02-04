import { useEffect, useState } from 'react'

export function useAsyncMemo<T extends any>(loader: () => Promise<T>, init: T, deps: any[]): T {
   const [content, setContent] = useState<T>(init)
   useEffect(() => { loader().then(setContent, console.error) }, deps)
   return content
}

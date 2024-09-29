import { useCallback, useState } from 'react'

type Initier<S> = S | (() => S)

function getStorageValue<T = any>(key: string, initier: Initier<T>): T {
   try {
      const value = window.sessionStorage.getItem(key)
      if (typeof value === "string") return JSON.parse(value)
   }
   catch (_) { }
   if (initier instanceof Function) return initier()
   else return initier
}

function setStorageValue<T = any>(key: string, value: T): T {
   if (value === undefined) window.sessionStorage.removeItem(key)
   else window.sessionStorage.setItem(key, JSON.stringify(value))
   return value
}

export function useSessionStorage<T = any>(key: string, initier: Initier<T>): [T, (x: T) => void] {
   const [value, setValue] = useState(getStorageValue(key, initier))
   const changeValue = useCallback((value: T) => setValue(setStorageValue(key, value)), [key])
   return [value, changeValue]
}

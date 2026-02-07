import { useState, useEffect } from 'react'
import type { MapLike } from 'typescript'

export function useLocation(): Location {
   const [location, setLocation] = useState(window.location)

   useEffect(() => {
      const handleLocationChange = () => {
         setLocation(window.location)
      }

      window.addEventListener('popstate', handleLocationChange)
      window.addEventListener('hashchange', handleLocationChange)
      return () => {
         window.removeEventListener('popstate', handleLocationChange)
         window.removeEventListener('hashchange', handleLocationChange)
      }
   }, [])

   return location
}

export function useLocationHash(): string {
   const [location, setLocation] = useState(window.location.hash)

   useEffect(() => {
      const handleLocationChange = () => {
         setLocation(window.location.hash)
      }
      window.addEventListener('hashchange', handleLocationChange)
      return () => {
         window.removeEventListener('hashchange', handleLocationChange)
      }
   }, [])

   return location
}

export function getLocationQuery(): Record<string, string> {
   const { search } = window.location
   const query = {}
   if (search.startsWith("?")) {
      for (const param of search.slice(1).split("&")) {
         const parts = param.split('=')
         query[parts[0]] = decodeURIComponent(parts[1])
      }
   }
   return query
}

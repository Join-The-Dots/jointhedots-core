import { useLocationQuery } from "components/hooks/useLocationQuery";
import React from "react";

export enum ThemeLighting {
   Dark = 0,
   Light = 1,
}

export class ThemeProvider {
   static globalTheme: ThemeProvider = null
   contrastTheme: ThemeProvider = this
   constructor(
      readonly lighting: ThemeLighting,
   ) {
   }
   get isLight(): boolean {
      return this.lighting === ThemeLighting.Light
   }
   get isDark(): boolean {
      return this.lighting === ThemeLighting.Dark
   }
}

export function LocalTheme(props: { theme: ThemeProvider, children: any }) {
   return <ThemeContext.Provider value={props.theme || ThemeProvider.globalTheme}>
      {props.children}
   </ThemeContext.Provider>
}


export const LightTheme = new ThemeProvider(ThemeLighting.Light)
export const DarkTheme = new ThemeProvider(ThemeLighting.Dark)

LightTheme.contrastTheme = DarkTheme
DarkTheme.contrastTheme = LightTheme
setGlobalTheme(getDefaultTheme())

export const ThemeContext = React.createContext<ThemeProvider>(ThemeProvider.globalTheme)

function getDefaultTheme(): ThemeProvider {
   const query = useLocationQuery()
   if (query.theme) {
      return query.theme === "dark" ? DarkTheme : LightTheme
   }
   else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return DarkTheme
   }
   else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return LightTheme
   }
   return DarkTheme
}


function setGlobalTheme(theme: ThemeProvider) {
   if (theme !== ThemeProvider.globalTheme) {
      const { body } = document
      if (theme.lighting === ThemeLighting.Dark) {
         if (!body.className.includes("dark")) {
            if (body.className.includes("light")) body.className = body.className.replace("dark", "light")
            else body.className = body.className += " theme-dark"
         }
      }
      else {
         if (!body.className.includes("light")) {
            if (body.className.includes("dark")) body.className = body.className.replace("light", "dark")
            else body.className = body.className += " theme-light"
         }
      }
      ThemeProvider.globalTheme = theme
   }
}

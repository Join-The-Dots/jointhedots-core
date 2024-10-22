import * as React from 'react';
import { createContext, useContext } from 'react';
import { useLocalStorage } from '@livedoc/editors/hooks/useLocalStorage';

export type SettingsType = {
  isAutocomplete: boolean
  isCharLimit: boolean
  isCharLimitUtf8: boolean
  isCollab: boolean
  isMaxLength: boolean
  shouldUseLexicalContextMenu: boolean
  tableCellBackgroundColor: boolean
  tableCellMerge: boolean

  showTableOfContents: boolean
  showComments: boolean
  showSideView: null | "markdown" | "treeview" | "treeview-extended"
}

export const EDITOR_DEFAULT_SETTINGS: SettingsType = {
  isAutocomplete: true,
  isCharLimit: false,
  isCharLimitUtf8: false,
  isCollab: false,
  isMaxLength: false,
  shouldUseLexicalContextMenu: true,
  tableCellBackgroundColor: true,
  tableCellMerge: true,
  
  showTableOfContents: false,
  showComments: false,
  showSideView: null,
}

export type SettingsContextShape = {
  settings: SettingsType
  setSettings(changes: Partial<SettingsType>);
};

export const SettingsContext: React.Context<SettingsContextShape> = createContext(null);

export const useSettings = (): SettingsContextShape => {
  return useContext(SettingsContext);
};

export function ManageSettings(props: { id: string, children: any }) {
  const [stored, setStored] = useLocalStorage(props.id, EDITOR_DEFAULT_SETTINGS)

  const data = React.useMemo(() => {
    return {
      settings: stored,
      setSettings(changes: Partial<typeof stored>) {
        const settings = { ...EDITOR_DEFAULT_SETTINGS, ...stored, ...changes, } as typeof stored
        setStored(settings)
      },
    }
  }, [stored])

  return <SettingsContext.Provider value={data}>
    {props.children}
  </SettingsContext.Provider>
}

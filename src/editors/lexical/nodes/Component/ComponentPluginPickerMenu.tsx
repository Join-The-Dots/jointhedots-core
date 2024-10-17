import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { INSERT_TABLE_COMMAND } from '@lexical/table';
import { LexicalEditor, TextNode } from 'lexical';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ReactDOM from 'react-dom';
import useModal from '../../hooks/useModal';
import { getLexicalComponentsProvider, TextualComponentSelect } from './TextualComponentList';
import { openDialog } from '@livedoc/editors/ui/openDialog';
import { insertComponentDialog } from './ComponentViewDialog';
import { PanelNodeCreation } from '@livedoc/editors/ui/PanelNodeCreation';
import { ComponentsRegistry } from '@livedoc/core/library';
import { Menu } from '@livedoc/editors/ui/openContextualMenu';
import { getComponentGroupName } from '@livedoc/editors/common/pub-helpers';

class ComponentPickerOption extends MenuOption {
  constructor(
    key: string,
    readonly title: string,
    readonly icon: string,
    readonly group: string,
    readonly description: string,
    readonly onSelect: (queryString: string, editor: LexicalEditor) => void,
  ) {
    super(key);
  }
}

function getDynamicOptions(editor: LexicalEditor, queryString: string) {
  const options: Array<ComponentPickerOption> = [];

  if (queryString == null) {
    return options;
  }

  const tableMatch = queryString.match(/^([1-9]\d?)(?:x([1-9]\d?)?)?$/);

  if (tableMatch !== null) {
    const rows = tableMatch[1];
    const colOptions = tableMatch[2]
      ? [tableMatch[2]]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String);

    options.push(
      ...colOptions.map(
        (columns) => {
          const title = `${rows}x${columns} Table`
          return new ComponentPickerOption(title, title, "bi:table", "[]", null, () =>
            editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns, rows }),
          )
        },
      ),
    );
  }

  return options;
}

export function ComponentPluginPickerMenu(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useModal();
  const [options, setOptions] = useState(null);
  const [queryString, setQueryString] = useState<string | null>(null);
  const provider = useMemo(getLexicalComponentsProvider, []);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  useEffect(() => {
    provider.search_component_publications(queryString).then(result => {
      const options = [
        ...getDynamicOptions(editor, queryString),
        ...result.map(entry => new ComponentPickerOption(entry.component_id, entry.title, entry.icon, getComponentGroupName(entry.title), entry.description, () => {
          const apply = TextualComponentSelect[entry.component_id]
          if (!apply) {
            const component = ComponentsRegistry.acquireComponent(entry.component_id)
            openDialog<void>((onClose) => {
              return <PanelNodeCreation
                service='view'
                component={component}
                onComplete={async (data) => {
                  await insertComponentDialog(editor, entry.component_id, data)
                  onClose()
                }}
                onCancel={onClose}
              />
            });
          }
          else apply(editor)
        })),
      ]
      options.sort((x, y) => {
        return x.title.localeCompare(y.title)
      })
      setOptions(options)
    })
  }, [editor, queryString, showModal]);

  const onSelectOption = useCallback(
    (
      selectedOption: ComponentPickerOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect(matchingString, editor);
        closeMenu();
      });
    },
    [editor],
  );

  if (!options) {
    return null
  }
  return (
    <>
      {modal}
      <LexicalTypeaheadMenuPlugin<ComponentPickerOption>
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={checkForTriggerMatch}
        options={options}
        menuRenderFn={(
          anchorElementRef,
          { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
        ) =>
          anchorElementRef.current && options.length
            ? ReactDOM.createPortal(
              <div className="typeahead-popover component-picker-menu">
                <ul>
                  {options.map((option: ComponentPickerOption, i: number) => (
                    <Menu.LargeItem
                      key={option.key}
                      title={option.title}
                      icon={option.icon}
                      isSelected={selectedIndex === i}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(i);
                      }}
                      onElementRef={options.setRefElement}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current,
            )
            : null
        }
      />
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { createComponentFilter, ComponentPublication, getViewReferenceFrom, gotoURLView, ViewInfos, getServicePoint, acquireServicePoint } from "@jointhedots/core"
import { ItemRowShort, LabelButton } from '@jointhedots/ui/Items'
import { AppDescriptor, AppPage, AppTooling } from '.'
import { ComponentsFilteredList } from '../ComponentsLibrary'
import { ServicePointStatus } from '../ServicePoint'
import { useCurrentView } from '@jointhedots/core/react'
import Icon from "@jointhedots/ui/Icon"

export const useOutsideClick = (callback: () => void) => {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [callback])

    return ref
}

function matchEntry(entry: AppPage, active: string): boolean {
    const view = getViewReferenceFrom(entry?.view)
    return view === active
}

function findSelectedMenu(title: string, entry: AppPage, active: string): string {
    if (entry && entry.pages) {
        for (const key in entry.pages) {
            const res = findSelectedMenu(key, entry.pages[key], active)
            if (res) return res
        }
    }
    else if (matchEntry(entry, active)) {
        return title
    }
    return null
}

export function PageMenu(props: {
    title?: string
    entry: AppPage
    active: string
    onGoto: (entry: AppPage) => void
}) {
    const { title, entry, active, onGoto } = props
    const [open, setOpen] = useState(false)
    const ref = useOutsideClick(() => setOpen(false))
    const selected = findSelectedMenu(title, entry, active)

    const entries = entry.pages
    const label = selected ? selected : title
    const className = `slds-context-bar__item slds-context-bar__dropdown-trigger slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open ${selected ? 'slds-is-active' : ''}`
    return <li className={className}>
        <a className="slds-context-bar__label-action" title="Menu Item" onClick={() => setOpen(!open)}>
            <span className="slds-truncate" title={label}>{label}</span>
        </a>
        {title && <div className="slds-context-bar__icon-action slds-p-left_none" onClick={() => setOpen(!open)}>
            <button className="slds-button slds-button_icon slds-button_icon slds-context-bar__button" aria-haspopup="true" title={`Open ${title}`}>
                <Icon className="slds-button__icon" name="utility:chevrondown" />
                <span className="slds-assistive-text">Open menu item submenu</span>
            </button>
        </div>}
        {open && <div ref={ref} className="slds-dropdown slds-dropdown_left">
            <ul className="slds-dropdown__list" role="menu">
                {entries && Object.keys(entries).map((title, i) => {
                    const entry = entries[title]
                    return <li key={i} className="slds-dropdown__item slds-p-horizontal_xx-small" role="presentation">
                        <ItemRowShort
                            name={title}
                            icon={entry.icon || "blank"}
                            summary={entry.description || title}
                            onSelect={(() => {
                                setOpen(false)
                                onGoto(entry)
                            })}
                        />
                    </li>
                })}
            </ul>
        </div>}
    </li>
}

export function ApplicationMenu(props: {
    toolings: AppTooling[]
    origin: ViewInfos
    onClose: () => void
}) {
    const { toolings, origin, onClose } = props
    const ref = useOutsideClick(onClose)
    const filter = useMemo(() => createComponentFilter({
        services: ["view.react"],
        types: ["jtd:application.board.component"]
    }), [])
    const onGoto = (infos: ComponentPublication) => {
        onClose()
        gotoURLView({ name: infos.component_id })
    }
    return <div ref={ref} className="slds-dropdown slds-dropdown_left">
        <div style={{ display: "flex", fontSize: "130%", justifyContent: "flex-start", paddingLeft: 5, borderBottom: "solid thin #0005" }}>
            <LabelButton icon="bi:person-gear" name="Configuration" onActivate={() => {
                gotoURLView({ name: "settings" }, origin)
            }} />
            {Array.isArray(toolings) && <ApplicationTooling toolings={toolings} anchor="menu" />}
        </div>
        <ComponentsFilteredList filter={filter} onSelect={onGoto} />
    </div>
}

export function NavBar(props: {
    descriptor: AppDescriptor
    panel?: boolean
    active: string
    origin: ViewInfos
}) {
    const { panel, descriptor, active, origin } = props
    const [open, setOpen] = useState(false)
    const { title, pages, toolings } = descriptor

    const onGoto = (entry: AppPage) => {
        entry.view && gotoURLView(entry.view, origin)
    }

    return (
        <div className="slds-context-bar">
            <div className="slds-context-bar__primary">
                <div className="slds-context-bar__item slds-context-bar__dropdown-trigger slds-dropdown-trigger slds-dropdown-trigger_click slds-no-hover slds-is-open">
                    <div className="slds-context-bar__icon-action">
                        <button className="slds-button slds-icon-waffle_container slds-context-bar__button" onClick={() => setOpen(!open)} title="Settings">
                            <span className="slds-icon-waffle">
                                <span className="slds-r1"></span>
                                <span className="slds-r2"></span>
                                <span className="slds-r3"></span>
                                <span className="slds-r4"></span>
                                <span className="slds-r5"></span>
                                <span className="slds-r6"></span>
                                <span className="slds-r7"></span>
                                <span className="slds-r8"></span>
                                <span className="slds-r9"></span>
                            </span>
                            <span className="slds-assistive-text">Open App Launcher</span>
                        </button>
                    </div>
                    {open && <ApplicationMenu toolings={toolings} origin={origin} onClose={() => setOpen(false)} />}
                    {!panel && title && <span className="slds-context-bar__label-action slds-context-bar__app-name">
                        <span className="slds-truncate" title="App Name">{title}</span>
                    </span>}
                </div>
            </div>
            <nav className="slds-context-bar__secondary" role="navigation">
                <ul className="slds-grid">
                    {pages && Object.keys(pages).map((title) => {
                        const entry = pages[title]
                        if (entry.pages) {
                            return <PageMenu
                                key={title}
                                title={title}
                                entry={entry}
                                active={active}
                                onGoto={onGoto}
                            />
                        }
                        else {
                            const className = `slds-context-bar__item ${matchEntry(entry, active) ? 'slds-is-active' : ''}`
                            return (<li key={title} className={className}>
                                <a
                                    title={title}
                                    className="slds-context-bar__label-action"
                                    onClick={() => onGoto(entry)}
                                >
                                    <span className="slds-truncate" title={entry.description || title}>{title}</span>
                                </a>
                            </li>)
                        }
                    })}
                </ul>
                <div style={{ flexGrow: 1, display: 'flex' }}>
                    <div style={{ flexGrow: 1, }}></div>
                </div>
            </nav>
            <div>
                {Array.isArray(toolings) && <ApplicationTooling toolings={toolings} anchor="status" />}
                <span style={{ fontSize: "130%" }}>
                    <LabelButton icon="bi:person-gear" name="Configuration" onActivate={() => {
                        gotoURLView({ name: "settings" }, origin)
                    }} />
                </span>
            </div>
        </div>
    )
}

function ApplicationTooling(props: {
    toolings: AppTooling[]
    anchor: string
}) {
    const { toolings, anchor } = props
    const origin = useCurrentView()
    return <>
        {toolings.map((desc, key) => {
            if (desc.anchor !== anchor) {
                return null
            }
            if (desc.type === "servicePoint") {
                let scv = acquireServicePoint(desc.id)
                if (scv) {
                    return <ServicePointStatus key={key} servicePoint={scv} />
                }
            }
            else if (desc.type === "link") {
                const { url, view, title, icon } = desc
                if (url) {
                    return <LabelButton key={key} icon={icon} name={title} onActivate={() => {
                        window.open(url, "_blank")
                    }} />
                }
                else if (view) {
                    return <LabelButton key={key} icon={icon} name={title} onActivate={() => {
                        gotoURLView(view, origin)
                    }} />
                }
            }
            return null
        })}
    </>
}
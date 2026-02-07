import { ButtonGroup, PageHeader, PageHeaderDetail, PageHeaderHeading, Button as RButton } from 'react-lightning-design-system'

export function SLDSPage({ children, icon, title, onClose, legend, buttons, info, minHeight }:
    { children: any, icon?: any, title: string, legend?: string, onClose?: Function, buttons?: any, info?: string, minHeight?: string }) {

    return <PageHeader>
        <PageHeaderHeading
            figure={icon}
            info={info}
            legend={legend || ''}
            title={title}
            rightActions={<ButtonGroup>{onClose && <RButton type="neutral" onClick={() => onClose()} icon="close" title='Close'></RButton>}{buttons}</ButtonGroup>}
        />
        <PageHeaderDetail>
            <Box sx={{
                backgroundColor: 'white', margin: "0 -1rem -1rem",
                padding: isMobile() ? "0" : "1rem",
                borderRadius: "0 0 0.25rem 0.25rem",
                width: '100%',
                minHeight: minHeight || '85vh',
            }}>
                {children}
            </Box>
        </PageHeaderDetail>

    </PageHeader>
}

export function isMobile() {
    return window.location.href.indexOf("embedded=true") > -1
}

export function NavigationBeacon({ children, component_id }) {
    return <>{children}</>
 }
 
 export function Box(props: { children?: any, className?: string, sx?: any }) {
    const { children, className, sx } = props
    return <div className={className} style={sx}>
       {children}
    </div>
 }
 
 export function Typography(props: { children?: any, variant?: any, className?: string, sx?: any }) {
    const { children, className, sx } = props
    return <div className={className} style={sx}>
       {children}
    </div>
 }
 
 export function Grid(props: { spacing?: any, md?: any, item?: boolean, container?: boolean, children: any, className?: string, sx?: any }) {
    const { children, className, sx } = props
    return <div className={className} style={sx}>
       {children}
    </div>
 }
 
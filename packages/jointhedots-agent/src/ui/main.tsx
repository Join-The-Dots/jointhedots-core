import AgentApp from './agent/app.tsx'
import DebuggerApp from './debugger/app.tsx'
import './index.css'
import { renderRoot } from './config.tsx'

// Switch between apps by uncommenting the desired one
// renderRoot(<AgentApp />)
renderRoot(<DebuggerApp />)

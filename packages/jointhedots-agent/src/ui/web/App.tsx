import './App.css'

function App() {

  return (
    <div className="app">
      <header className="header">
        <h1>🦁 AgentZoo</h1>
        <p>A framework for managing AI agents - works in browser and Node.js</p>
      </header>

      <section className="section">
        <h2>📊 Framework Summary</h2>
        <div className="stats">
          <div className="stat">
            <span className="stat-value">{"summary.agentCount"}</span>
            <span className="stat-label">Agents</span>
          </div>
          <div className="stat">
            <span className="stat-value">{"summary.taskCount"}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
          <div className="stat">
            <span className="stat-value">{"summary.completedTasks"}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat">
            <span className="stat-value">{"summary.failedTasks"}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>
          Core framework can be used from CLI: <code>npm run cli</code>
        </p>
        <p>
          Run tests: <code>npm run test</code>
        </p>
      </footer>
    </div>
  )
}

export default App

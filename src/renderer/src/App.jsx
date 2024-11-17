import './App.css' // Import the CSS file

function App() {
  const createUser = () => {
    window.electron.ipcRenderer.send('create-user', {
      username: 'john_doe',
      email: 'john@example.com'
    })
  }

  const runQuery = () => {
    window.electron.ipcRenderer.send('run-query', 'SELECT * FROM Users')
  }

  window.electron.ipcRenderer.on('query-results', (event, results) => {
    console.log('Query results:', results)
  })

  window.electron.ipcRenderer.on('query-error', (event, error) => {
    console.error('Query error:', error)
  })

  return (
    <div className="app-container">
      <h1>Bracketeer</h1>
      <div className="button-container">
        <button className="beveled-button" onClick={createUser}>
          Open New Session
        </button>
        <button className="beveled-button" onClick={runQuery}>
          Load Session From History
        </button>
      </div>
    </div>
  )
}

export default App

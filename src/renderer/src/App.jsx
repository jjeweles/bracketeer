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
    <div>
      <h1>Versions</h1>
      <button onClick={createUser}>Create User</button>
      <button onClick={runQuery}>Run Query</button>
    </div>
  )
}

export default App

import { BrowserRouter, Route, Routes } from 'react-router'
import Dashboard from './components/Dashboard'
import Session from './components/Session'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:sessionId" element={<Session />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

import React, { useState } from 'react'

export default function App() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    // call your IPC-backed addBowler endpoint
    console.log('Adding bowler: ' + name)
    const res = await window.api.addBowler(name)
    console.log('Response: ' + res)
    setStatus(res.success ? 'Added!' : `Error: ${res.error}`)
    if (res.success) setName('')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Add a Bowler</h1>
      <p className="mb-6">Enter the name of the bowler you’d like to save.</p>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="text"
          placeholder="Bowler Name"
          className="border p-2 rounded w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={!name.trim()}
        >
          Submit
        </button>
      </form>
      {status && <p className="mt-4">{status}</p>}
    </div>
  )
}

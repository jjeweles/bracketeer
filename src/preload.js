import { contextBridge, ipcRenderer } from 'electron'
import path from 'path'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: ipcRenderer.send.bind(ipcRenderer),
    on: ipcRenderer.on.bind(ipcRenderer)
  },
  path: path
})

contextBridge.exposeInMainWorld('api', {
  addBowler: (name) => ipcRenderer.invoke('pb-add-bowler', name)
})

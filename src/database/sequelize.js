// src/database/sequelize.js
import { Sequelize } from 'sequelize'
import { join } from 'path'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

let storagePath

if (is.dev) {
  // Use a local database file in development mode
  storagePath = join(__dirname, 'database.sqlite')
} else {
  // Use the user data directory for the database file in production mode
  const userDataPath = app.getPath('userData')
  storagePath = join(userDataPath, 'database.sqlite')
}

console.log('Using database file:', storagePath)

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath
})

export { sequelize }

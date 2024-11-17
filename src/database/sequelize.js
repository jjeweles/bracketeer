// src/database/sequelize.js
import { Sequelize } from 'sequelize'
import { join } from 'path'

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: join(__dirname, 'database.sqlite')
})

export { sequelize }

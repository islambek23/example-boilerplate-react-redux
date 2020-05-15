/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'
import axios from 'axios'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

const { readFile, writeFile, unlink } = require('fs').promises

let connections = []

const port = process.env.PORT || 3000
const server = express()

server.use(cors())

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())

const saveFile = async (users) => {
  await writeFile(`${__dirname}/test.json`, JSON.stringify(users), { encoding: 'utf8' })
}

const readingFile = () => {
  return readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => JSON.parse(data))
    .catch(async () => {
      const { data: users } = await axios.get('https://jsonplaceholder.typicode.com/users')
      await saveFile(users)
      return users
    })
}

server.get('/api/v1/users/', async (req, res) => {
  const users = await readingFile()
  res.json(users)
})

server.post('/api/v1/users/', async (req, res) => {
  const newUser = req.body
  const users = await readingFile()
  const newId = users[users.length - 1].id + 1
  const newUsers = [...users, { id: newId, ...newUser }]
  await saveFile(newUsers)
  res.json({ status: 'success', id: newId })
})

server.patch('/api/v1/users/:userId', async (req, res) => {
  const updateUser = req.body
  const { userId } = req.params
  const users = await readingFile()
  const updateUsers = users.reduce((acc, rec) => {
    if (rec.id === +userId) {
      return [...acc, { ...rec, ...updateUser }]
    }
    return [...acc, rec]
  }, [])
  await saveFile(updateUsers)
  res.json({ status: 'success', id: userId })
})

server.delete('/api/v1/users/:userId', async (req, res) => {
  const { userId } = req.params
  const users = await readingFile()
  const filteredUsers = users.filter((el) => el.id !== Number(userId))
  await saveFile(filteredUsers)
  res.json({ success: 'Success' })
})

server.delete('/api/v1/users/', (req, res) => {
  unlink(`${__dirname}/test.json`)
  res.json({ status: 'Success del all users' })
})

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)

// server.get('/api/v1/users', async (req, res) => {
//     const { data: users } = await readFile(`${__dirname}/test.json`, {encoding: 'utf8'})
//     res.json(users)
// })

import express from 'express'
import dotenv from 'dotenv'
import { genSaltSync, hashSync } from 'bcrypt'
import { StreamChat } from 'stream-chat'

dotenv.config()

const { PORT, STREAM_API_KEY, STREAM_API_SECRET } = process.env
const client = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET)

const app = express()
app.use(express.json())
const salt = genSaltSync(10)

interface User {
  id: string
  email: string
  hashedPassword: string
}

const users: User[] = []

app.post('/register', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ message: 'Missing email or password' })
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  const existingUser = users.find((user) => user.email === email)
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' })
  }

  try {
    const hashedPassword = hashSync(password, salt)
    const id = Math.random().toString(36).slice(2)
    console.log('id', id)
    const NewUser = { id, email, hashedPassword }

    users.push(NewUser)

    await client.upsertUser({
      id,
      email,
      name: email,
    })

    const token = client.createToken(id)

    return res.status(200).json({
      token,
      user: {
        id,
        email,
      },
    })
  } catch (error) {
    res.status(500).json({ error: 'User already exists' })
  }
})

app.get('/login', (req, res) => {
  const { email, password } = req.body
  const user = users.find((user) => user.email === email)
  const hashedPassword = hashSync(password, salt)

  if (!user || user.hashedPassword !== hashedPassword) {
    return res.status(400).json({ message: 'Invalid credentials' })
  }

  const token = client.createToken(user.id)

  return res.status(200).json({
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  })
})

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`)
})

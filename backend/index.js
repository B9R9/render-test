require('dotenv').config()

const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const path = require('path')
const Person = require('./models/person')

const app = express()
app.use(express.static('build'))
app.use(express.json())
app.use(cors())

const requestLogger = (err, request, response, next) => {
  console.log('---------')
  console.log('Method:', request.method)
  console.log('Path:', request.path)
  console.log('body:', request.body)
  console.log('---')
  console.error(err.message)
  console.log('---------')
  next()
}

app.use(requestLogger)

morgan.token('body', (req, res) => {
  return JSON.stringify(req.body)
})

app.use(morgan('tiny'))
app.use(morgan('********\n:method :url :status :res[content-length] - :response-time ms :body\n*********'))

app.get('/api/persons', (request, response, next) => {
  Person.find({}).then(persons => {
    if (persons) {
      response.status(200).json(persons)
    } else {
      console.log('Error Fetching Persons')
      response.status(404).end()
    }
  })
    .catch(err => next(err))
})

app.get('/info', (request, response) => {
  const date = new Date()
  Person.countDocuments({})
    .then(count => {
      if (!count) {
        console.error('Error counting documents: ')
      } else {
        response.send(`<p>PhoneBook has info for ${count} people</p><p>${date}</p>`)
      }
    })
})

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.status(200).json(person)
      } else {
        response.status(404).end()
      }
    })
    .catch(err => next(err))
})

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndDelete(request.params.id)
    .then(person => {
      if (person) {
        console.log('Successful Deletion')
        response.status(204).end()
      } else {
        response.status(404).end()
      }
    })
    .catch(err => next(err))
})

app.post('/api/persons', (request, response, next) => {
  const body = request.body
  if (!body.name || !body.number) {
    return response.status(400).json({
      error: 'Content missing'
    })
  }

  Person.findOne({ name: body.name })
    .then(person => {
      if (person) {
        console.log('error: that name is already in the phonebook')
        return response.status(400).json({ error: 'that name is already in the phonebook' })
      } else {
        const person = new Person({
          name: body.name,
          number: body.number
        })

        person.save()
          .then(savedPerson => {
            response.json(savedPerson)
          })
          .catch(err => next(err))
      }
    })
    .catch(err => next(err))
})

app.put('/api/persons/:id', (request, response, next) => {
  const body = request.body

  const person = {
    name: body.name,
    number: body.number
  }

  Person.findByIdAndUpdate(request.params.id, person, { new: true, runValidators: true, context: 'query' })
    .then(updatedPerson => {
      if (updatedPerson) {
        response.json(updatedPerson)
      } else {
        response.status(404).send({ error: 'Not updated' })
      }
    })
    .catch(err => next(err))
})

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' })
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.log('BACK END: ', error.message)

  if (error.name === 'CastError') {
    return response.status(400).send({ error: 'mal formatted id' })
  } else if (error.name === 'ValidationError') {
    return response.status(400).send({ error: error.message })
  }
  next(error)
}

app.use(errorHandler)

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

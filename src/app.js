const createError = require('http-errors')
const express = require('express')
const compression = require('compression')
const logger = require('morgan')
const cors = require('cors')

// Load environment variables from .env.local in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '.env.local' })
}

// create express web server app
const app = express()

// log requests to the terminal when running in a local debug setup
if(process.env.NODE_ENV !== 'production')
  app.use(logger('dev'))

app.use(express.json({limit: '10mb'}))
app.use(express.urlencoded({ extended: false }))
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))
app.use(compression())

// Define URL for our compute server
// - For local debugging on the same computer, rhino.compute.exe is
//   typically running at http://localhost:5000/ (exe) or http://localhost:6500/ (debug)
// - For a production environment it is good to use an environment variable
//   named RHINO_COMPUTE_URL to define where the compute server is located
// - And just in case, you can pass an address as a command line arg

const argIndex = process.argv.indexOf('--computeUrl')
if (argIndex > -1)
  process.env.RHINO_COMPUTE_URL = process.argv[argIndex + 1]
if (!process.env.RHINO_COMPUTE_URL)
  process.env.RHINO_COMPUTE_URL = 'http://localhost:6500/' // default if nothing else exists

console.log('RHINO_COMPUTE_URL: ' + process.env.RHINO_COMPUTE_URL)

app.set('view engine', 'hbs');
app.set('views', './src/views')

// Routes for this app
app.use('/examples', express.static(__dirname + '/examples'))
app.get('/favicon.ico', (req, res) => res.status(200))
app.use('/definition', require('./routes/definition'))
app.use('/solve', require('./routes/solve'))
app.use('/view', require('./routes/template'))
app.use('/version', require('./routes/version'))
app.use('/', require('./routes/index'))

// Health check endpoint for AWS
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: require('../package.json').version
  });
});

// ref: https://github.com/expressjs/express/issues/3589
// remove line when express@^4.17
express.static.mime.types["wasm"] = "application/wasm";

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  console.error(err)
  res.locals.error = req.app.get('env') === 'development' ? err : {}
  data = { message: err.message }
  if (req.app.get('env') === 'development')
  {
    data.stack = err.stack
  }
  // send the error
  res.status(err.status || 500).send(data)
})

module.exports = app

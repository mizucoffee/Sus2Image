const express = require('express')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
const SusAnalyzer = require('sus-analyzer')
const sus2image = require('sus-2-image')
const app = express()

app.use(bodyParser.urlencoded({ limit:'100mb',extended: true }))
app.use(bodyParser.json({limit:'100mb'}))
app.use(fileUpload({limits: { fileSize: 8 * 1024 * 1024 }}))
app.use(express.static('./public'))
app.set('view engine', 'pug')

const server = app.listen(process.env.PORT || 3000, () => console.log("Node.js is listening to PORT:" + server.address().port))

app.get('/', (req, res) => {
  res.render('index')
})

app.get('/convert', async (req, res) => {
  res.redirect('/')
})

app.post('/convert', async (req, res) => {
  if(!req.hasOwnProperty('files')) res.redirect('/')
  const sus = req.files.sus.data.toString()
  const meta = SusAnalyzer.getMeta(sus)
  const measures = await sus2image.getMeasures(sus)

  res.render('show',{meta: meta, images: measures})
})

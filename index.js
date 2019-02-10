const express = require('express')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
const SusAnalyzer = require('sus-analyzer')
const sus2image = require('sus-2-image')
const fs = require('fs-extra')
const uniqid = require('uniqid')
const pug = require('pug')
const puppeteer = require('puppeteer')
const { JSDOM } = require("jsdom")
const app = express()

app.use(bodyParser.urlencoded({ limit:'100mb',extended: true }))
app.use(bodyParser.json({limit:'100mb'}))
app.use(fileUpload({limits: { fileSize: 8 * 1024 * 1024 }}))
app.use(express.static('./public'))
app.set('view engine', 'pug')

const server = app.listen(process.env.PORT || 3000, () => console.log("Node.js is listening to PORT:" + server.address().port))

app.get('/',        (req, res) => res.render('index'))
app.get('/convert', (req, res) => res.redirect('/'))
app.post('/convert', async (req, res) => {
  if(!req.hasOwnProperty('files')) return res.redirect('/')
  const sus = req.files.sus.data.toString()
  const meta = SusAnalyzer.getMeta(sus)
  const image = await sus2image.getSVG(sus)
  await sus2image.getPNG(sus)
  const height = Number(new JSDOM(image).window.document.querySelector('svg').getAttribute('height').replace('px',''))
  const id = uniqid.process()
  fs.ensureDirSync(`./public/svg/`)
  fs.ensureDirSync(`./public/img/`)
  fs.writeFileSync(`./public/svg/${id}.svg` , image)

  if (meta.DIFFICULTY == null) meta.DIFFICULTY = { BACKGROUND: '#e8f6e8', COLOR: '#19aa19', TEXT: 'BASIC' }

  const html = pug.renderFile('frame.pug', {
    height,
    id,
    meta
  })

  fs.writeFileSync(`./public/${id}.html`, html)

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.goto(`http://localhost:${process.env.PORT || 3000}/${id}.html`)
  await page.evaluateHandle('document.fonts.ready');

  const clip = await page.evaluate(s => {
    const { width, height, top: y, left: x } = document.querySelector(s).getBoundingClientRect()
    return { width, height, x, y }
  }, '#mainFrame')

  await page.screenshot({ clip, path: `./public/img/${id}.png` })
  await browser.close();

  fs.removeSync(`./public/${id}.html`)

  res.render('show',{ meta: meta, id: id })
})

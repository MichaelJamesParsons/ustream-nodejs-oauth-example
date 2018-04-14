const express = require('express')
const bodyParser = require('body-parser')
const expressHandlebars = require('express-handlebars')
const Ustream = require('ustream-sdk')
const app = express()

app.engine('handlebars', expressHandlebars())
app.set('view engine', 'handlebars')
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))

/**
 * The app's entry point.
 *
 * Renders a button that links to Ustream's Oauth login page. This application
 * assumes your USTREAM_REDIRECT_URI returns to:
 *
 *    https://yourDomain.com/channels
 */
app.get('/', (req, res) => {
  const oauthParams = {
    response_type: "token",
    client_id: process.env.USTREAM_CLIENT_ID,
    redirect_uri: process.env.USTREAM_REDIRECT_URI,
    token_type: "bearer"
  }

  // Append oauthParams as query string parameters to the authorization url.
  const endpoint = Object.keys(oauthParams).reduce((queryString, param) => {
    return `${queryString}&${param}=${oauthParams[param]}`
  }, `https://www.ustream.tv/oauth2/authorize?`)

  res.render('index', { endpoint })
})

/**
 * The endpoint where your OAuth redirect should send the user after
 * they have logged in to their Ustream account.
 */
app.get('/channels', (req, res) => {
  const { access_token, token_type, expires_in } = req.query
  const ustream = new Ustream({
    type: 'oauth_bearer',
    access_token,
    token_type,
    expires_in
  })

  ustream.channel.list()
    .then((channels) => {
      // Ustream's API returns a page of channels as an object, where the keys
      // are the ids of each channel and the values are their corresponding
      // fields. This extracts the data for each channel as an array.
      const channelData = Object.keys(channels.data).map((id) => {
        return channels.data[id]
      })

      res.render('channels', {
        success: true,
        channels: channelData
      })
    })
    .catch(function () {
      res.render('channels', {
        success: false
      })
    })
})

app.listen(3000)

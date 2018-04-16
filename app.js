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
 * Renders two buttons which link to Ustream's oauth login page. This
 * application assumes your USTREAM_REDIRECT_URI returns to:
 *
 *    https://yourDomain.com/channels
 */
app.get('/', (req, res) => {
  const oauthParams = {
    client_id: process.env.USTREAM_CLIENT_ID,
    redirect_uri: process.env.USTREAM_REDIRECT_URI,
    token_type: "bearer"
  }

  // Append oauthParams as query string parameters to the authorization url.
  const implicit_flow_endpoint = Object.keys(oauthParams)
    .reduce((queryString, param) => {
      return `${queryString}&${param}=${oauthParams[param]}`
    }, `https://www.ustream.tv/oauth2/authorize?response_type=token`)

  const auth_code_flow_endpoint = Object.keys(oauthParams)
    .reduce((queryString, param) => {
      return `${queryString}&${param}=${oauthParams[param]}`
    }, `https://www.ustream.tv/oauth2/authorize?response_type=code`)

  res.render('index', {
    implicit_flow_endpoint,
    auth_code_flow_endpoint
  })
})

/**
 * The endpoint where your OAuth redirect should send the user after
 * they have logged in to their Ustream account.
 *
 * http://developers.video.ibm.com/channel-api/getting-started.html#authorization-flows_2
 */
app.get('/channels', (req, res) => {
  let ustream = null

  if (req.query.code) {
    // Authorization code flow
    ustream = new Ustream({
      type: 'oauth_code',
      client_id: process.env.USTREAM_CLIENT_ID,
      client_secret: process.env.USTREAM_CLIENT_SECRET,
      code: req.query.code,
      redirect_uri: process.env.USTREAM_REDIRECT_URI
    })
  } else if (req.query.access_token) {
    // Implicit flow
    ustream = new Ustream({
      type: 'oauth_token',
      access_token: req.query.access_token,
      token_type: req.query.token_type,
      expires_in: req.query.expires_in
    })
  } else {
    // No code or token provided. Show error.
    res.render('channels', {
      success: false
    })

    return null
  }

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
    .catch(() => {
      // Oauth failed. Show error.
      res.render('channels', {
        success: false
      })
    })
})

app.listen(3000)

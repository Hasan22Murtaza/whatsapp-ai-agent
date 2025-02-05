const express = require("express")
const messageRouter = require('./routers/messageRouter')
const whatsappclient = require('./services/WhatsappClient')

// whatsappclient.initialize();
const app = express()
app.use(express.json())
app.use(messageRouter)

app.listen(4000, () => console.log(`Server is ready in on port ${4000}`))

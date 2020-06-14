const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const Agenda = require("agenda");
const app = express();
const passport = require("passport");
const cors = require("cors");
const amqp = require('amqplib/callback_api');
const socketIO = require('socket.io');


require('dotenv').config();

mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

app.use(cors());

const { env: { PORT, MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_PORT, MONGO_DB_NAME, SQS_REGION, SQS_KEY, SQS_PASSWORD, SQS_URL } } = process;

let mongoConnectStr = "";

MONGO_USERNAME === "" && MONGO_PASSWORD === "" ? mongoConnectStr = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}`
  : mongoConnectStr = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}`;

mongoose.connect(mongoConnectStr, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;

const agenda = new Agenda({ db: { address: mongoConnectStr } });

require("./auth/auth");

app.use(bodyParser.urlencoded({ extended: false }));

const routes = require("./routes/routes");
const secureRoute = require("./routes/secure-routes");

app.use("/api", routes);

app.use('/api/secure', passport.authenticate('jwt', { session: false }), secureRoute);

app.use(function (err, req, res, next) {
  console.log(err);
  res.status(err.status || 500);
  res.send(err.toString());
});


const socketIOServer = app.listen(PORT, () => {
  console.log(`orbita server is running at ${PORT}`);
});

const io = socketIO(socketIOServer);

let ch = null;
let rootSocket = null;
let messages = [];
let i = 0;

//this makes sure we have unique task IDs when starting an stopping rhe server
let baseTaskID = Math.round((Date.now() - 1511098000000) / 1000);

amqp.connect('amqp://localhost', function (error, conn) {
  if (error) {
    console.log(error);
    throw new Error(error);
  }
  conn.createChannel(function (error, channel) {
    if (error) {
      console.log(error);
      throw new Error(error);
    }
    ch = channel;
    ch.consume('reservations', function (msg) {
      let messageObj = JSON.parse(msg.content.toString());
      console.log(messageObj.NefoneCustomer);
      setTimeout(() => {
        ch.ack(msg);
      });
    })
  });
});


console.log('Server started');
setInterval(() => i++, 2000);


io.on("connection", (socket) => {
  console.log("Connection opened");
    setInterval(() => {
      socket.emit("newTask", {
        taskName: `Task ${baseTaskID + i}`,
        taskID: baseTaskID + i
    })
    }, 5000);
});

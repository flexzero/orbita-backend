const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const passport = require("passport");
const cors = require("cors");
const AWS = require("aws-sdk");
const { Consumer } = require('sqs-consumer');
const { ReservationsModel } = require('./models/model')
require('dotenv').config();

mongoose.set('useCreateIndex', true);

app.use(cors());

const { env: { PORT, MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_PORT, MONGO_DB_NAME, SQS_REGION, SQS_KEY, SQS_PASSWORD, SQS_URL } } = process;

let mongoConnectStr = "";

MONGO_USERNAME === "" && MONGO_PASSWORD === "" ? mongoConnectStr = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}`
  : mongoConnectStr = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}`;

mongoose.connect(mongoConnectStr, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;

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

AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD });

let sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

sqs.getQueueAttributes({ QueueUrl: SQS_URL }, function (err, data) {
  if (err) {
    console.log(err);
  } else {
    console.log("SQS Attributes: ", data);
  }
});

const sqsApp = Consumer.create({
  queueUrl: SQS_URL,
  handleMessage: async (message) => {

    let { Body: recievedMessage } = message;
    recievedMessage = JSON.parse(recievedMessage);
    let { ResId, Status, NetfoneCustomer } = recievedMessage;
    try {
      if (NetfoneCustomer === "Quest.Maribyrnong") {
        let reservationExists = await ReservationsModel.find({ ResId }, { _id: 0 });
        if (reservationExists.length === 0) {
          console.log(recievedMessage);
          console.log("New reservation: ", recievedMessage);
          recievedMessage.AreaName === "" ? recievedMessage.AreaName = "Unspecified" : ""
          await ReservationsModel.create(recievedMessage);
        } else if (reservationExists.length > 0 && reservationExists[0].Status !== Status) {
          console.log("Reservation status changed");
          let filter = { ResId };
          let update = { Status };
          await ReservationsModel.findOneAndUpdate(filter, update, { new: true, useFindAndModify: false });
        } else {
          console.log("Reservation exists");
        }
      } else {

        console.log("Not Quest.Maribyrnong but: ", NetfoneCustomer);
      }

    }
    catch (error) {
      console.log(error);
      throw new Error(error);
    }

  },
  sqs: new AWS.SQS()
});

sqsApp.on('error', (err) => {
  console.error(err.message);
});

sqsApp.on('processing_error', (err) => {
  console.error(err.message);
});

sqsApp.on('timeout_error', (err) => {
  console.error(err.message);
});

sqsApp.start();


app.listen(PORT, () => {
  console.log(`orbita server is running at ${PORT}`);
});

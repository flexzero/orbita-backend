const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
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

let mongoConnectStr = "mongodb+srv://orbita:crazyorbita@cluster1-7rnzb.mongodb.net/orbita-test?retryWrites=true&w=majority";

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


app.listen(PORT, () => {
  console.log(`orbita server is running at ${PORT}`);
});

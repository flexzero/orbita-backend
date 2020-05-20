const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const app = express();
const passport = require("passport");
const cors = require("cors");

app.use(cors());

mongoose.connect("mongodb://127.0.0.1:27017/project-orbita", { useNewUrlParser: true});
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;

require("./auth/auth");

app.use(bodyParser.urlencoded({ extended: false }));

const routes = require("./routes/routes");
const secureRoute = require("./routes/secure-routes");

app.use("/api", routes);

app.use('/api/secure', passport.authenticate('jwt', {session: false}), secureRoute);

// app.use("/api/secure", secureRoute);

app.use(function (err, req, res, next) {
  console.log(err);
  res.status(err.status || 500);
  res.send(err.toString());
});

app.listen(1337, () => {
  console.log("orbita server is running at 3003");
});

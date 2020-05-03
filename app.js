const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const passport = require("passport");
const app = express();
const UserModel = require("./models/model");

mongoose.connect("mongodb://127.0.0.1:27017/project-orbita");
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;

require("./auth/auth");

app.use(bodyParser.urlencoded({ extended: false }));

const routes = require("./routes/routes");
const secureRoute = require("./routes/secure-routes");

app.use("/api", routes);

// app.use('/api/secure', passport.authenticate('jwt', {session: false}), secureRoute);
app.use("/api/secure", secureRoute);

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({ error: err });
});

app.listen(1337, () => {
  console.log("orbita server is running at 3003");
});

const passport = require("passport");
const mongoose = require("mongoose");
const localStrategy = require("passport-local").Strategy;
const { UserModel, TTLockAuthModel, NetfoneAuthModel } = require("../models/model");

const JWTstrategy = require("passport-jwt").Strategy;

const ExtractJWT = require("passport-jwt").ExtractJwt;

passport.use(
  new JWTstrategy(
    {
      jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
      secretOrKey: "top_secret"
    },
    (jwtPayload, done) => {
      console.log("The authentication token: ", jwtPayload);
      try {
        return done(null, jwtPayload.user);
      } catch (error) {
        console.log(error);
        done(error);
      }
    }
  )
);

passport.use(
  "signup",
  new localStrategy(
    {
      username: "username",
      password: "password",
      passReqToCallback: true
    },
    async (req, username, password, done) => {
      console.log(req);
      let { ttlockUsername, ttlockPassword, ttlockClientId, ttlockClientSecret, netfoneUsername, netfonePassword } = req.query;
      console.log(ttlockUsername, ttlockPassword, ttlockClientId, ttlockClientSecret, netfoneUsername, netfonePassword);
      try {
        const ttlockAuth = await TTLockAuthModel.create({
          _id: new mongoose.Types.ObjectId(),
          ttlockUsername,
          ttlockPassword,
          client_id: ttlockClientId,
          client_secret: ttlockClientSecret,
        });
        const netfoneAuth = await NetfoneAuthModel.create({ _id: new mongoose.Types.ObjectId(), netfoneUsername, netfonePassword });
        const user = await UserModel.create({ _id: new mongoose.Types.ObjectId(), username, password, ttlockAuthData: ttlockAuth._id, netfoneAuthData: netfoneAuth._id });
        return done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.use(
  "login",
  new localStrategy(
    {
      usernameField: "username",
      passwordField: "password"
    },
    async (username, password, done) => {
      try {
        const user = await UserModel.findOne({ username });
        if (!user) {
          return done(null, false, { message: "User not found" });
        } else {
          console.log("user found");
        }

        const validate = await user.isValidPassword(password);
        if (!validate) {
          return done(null, false, { message: "Wrong Password" });
        } else {
          console.log("password matched");
        }
        return done(null, user, { message: "Logged in successfully" });
      } catch (error) {
        console.log(error);
        return done(error);
      }
    }
  )
);

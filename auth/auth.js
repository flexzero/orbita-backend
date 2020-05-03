const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const { UserModel } = require("../models/model");

const JWTstrategy = require("passport-jwt").Strategy;

const ExtractJWT = require("passport-jwt").ExtractJwt;

passport.use(
  new JWTstrategy(
    {
      secretOrKey: "top_secret",

      jwtFromRequest: ExtractJWT.fromUrlQueryParameter("secret_token")
    },
    async (token, done) => {
      try {
        return done(null, token.user);
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.use(
  "signup",
  new localStrategy(
    {
      usernameField: "username",
      password: "password"
    },
    async (username, password, done) => {
      try {
        const user = await UserModel.create({ username, password });
        

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

        const validate = await  user.isValidPassword(password);
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

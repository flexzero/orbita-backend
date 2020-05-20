const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const qs = require("querystring");
const config = require("../config");
const urls = require("../urls");
const storage = require("node-persist");

const router = express.Router();

const axiosConfig = {
  headers: {
      "Content-Type": "application/x-www-form-urlencoded",
  },
};

router.post(
  "/signup",
  passport.authenticate("signup", { session: false }),
  async (req, res, next) => {
    res.json({
      message: "Signup successful",
      user: req.user,
    });
  }
);

router.post("/login", async (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        const error = new Error("An Error occurred");
        return next(error);
      }
      req.login(user, { session: false }, async (error) => {
        if (error) return next(error);

        const body = { _id: user._id, username: user.username };

        const token = jwt.sign({ user: body }, "top_secret");

        setTimeout(() => {
          return res.json({username: user.username, secret_token: token });
        }, 3000);
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

router.get("/authenticate", async (req, res, next) => {
  try {
    const authRes = await axios.post(
      urls.getAccessToken,
      qs.stringify(config),
      axiosConfig
    );

    if (!authRes.data.errmsg) {
      await storage.init();
      await storage.setItem("authData", authRes.data);
      await storage.setItem("loggedInDate", Date.now());
      res.send({ success: "success" });
    } else {
       throw new Error(authRes.data.errmsg);
    }
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;

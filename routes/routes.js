const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const { UserModel, TTLockAuthModel, NetfoneAuthModel } = require('../models/model')
const axios = require("axios");
const qs = require("querystring");
const urls = require("../urls");

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
        const error = new Error("User not found");
        return next(error);
      }
      req.login(user, { session: false }, async (error) => {
        if (error) return next(error);

        const body = { _id: user._id, username: user.username };

        const token = jwt.sign({ user: body }, "top_secret");

        try {
          let userFromDB = await UserModel.findOne({ _id: user._id });

          let { ttlockAuthData: ttlockAuthId, netfoneAuthData: netfoneAuthId } = userFromDB;

          let ttlockAuthFromDB = await TTLockAuthModel.findOne({ _id: ttlockAuthId });
          if (ttlockAuthFromDB.access_token === null) {
            let authDataFromTTLockServer = await getTTLockAuthData(ttlockAuthFromDB);
            let { access_token, refresh_token, uid, openid, scope, token_type, expires_in } = authDataFromTTLockServer;
            const ttlockFilter = { _id: ttlockAuthId };
            const ttlockUpdate = { access_token, refresh_token, uid, openid, scope, token_type, expires_in, loggedin_at: Date.now() };
            let updatedTTLockDataToDB = await TTLockAuthModel.findOneAndUpdate(ttlockFilter, ttlockUpdate);
          } else if (ttlockAuthFromDB.access_token === null && ((ttlockAuthFromDB.expires_in * 1000) + ttlockAuthFromDB.loggedin_at > Date.now())) {
            renewTTLockAuthData();
          }
          else {
            console.log("access token already set...");
          }


          let netfoneAuthFromDB = await NetfoneAuthModel.findOne({ _id: netfoneAuthId });
          if (netfoneAuthFromDB.access_token === null) {
            let authDataFromNetfoneServer = await getNetfoneAuthData(netfoneAuthFromDB);
            const netfoneFilter = { _id: netfoneAuthId };
            const netfoneUpdate = { accessToken: authDataFromNetfoneServer, loggedin_at: Date.now() };
            let updatedNetfoneDataToDB = await NetfoneAuthModel.findOneAndUpdate(netfoneFilter, netfoneUpdate);
          } else {
            console.log('netfone access token already set...');
          }
        } catch (error) {
          return next(error);
        }
        return res.status(200).send({ username: user.username, secret_token: token });
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
});

const getTTLockAuthData = async ({ client_id, client_secret, ttlockUsername: username, ttlockPassword: password, redirect_uri }) => {

  const dataToPost = qs.stringify({
    client_id,
    client_secret,
    grant_type: "password",
    username,
    password,
    redirect_uri
  });

  try {
    const response = await axios.post(urls.getAccessToken, dataToPost, axiosConfig) || {};

    if (response.data && !response.data["errcode"]) {
      return response.data;
    } else {
      throw new Error(response.data.errmsg);
    }
  } catch (error) {
    throw new Error(error);
  }
};

const getNetfoneAuthData = async ({ netfoneUsername, netfonePassword }) => {
  
  const dataToPost = JSON.stringify({
    query: 'mutation ($input: TokenGetInput!) {\n    getAccessToken(input: $input) \n}',
    variables: { "input": { "username": netfoneUsername, "password": netfonePassword, "device_name": "pradeep's linux box", location: "au" } }
  });

  try {
    const response = await axios.post(urls.netfoneGraphQL, dataToPost, { headers: { 'Content-Type': 'application/json' } });
    const { data: { data: { getAccessToken } } } = response;
    return getAccessToken;
  } catch (error) {
    throw new Error(error);
  }
}

const renewTTLockAuthData = async () => {
  console.log("time to renew token using refresh token...");
}


module.exports = router;

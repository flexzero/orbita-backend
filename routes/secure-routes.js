const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const config = require("../config");
const urls = require("../urls");
const storage = require("node-persist");
const { LocksModel, PasscodesModel, LockUsersModel } = require("../models/model");

const router = express.Router();

const axiosConfig = {
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

router.post("/init", async (req, res, next) => {
  const { client_id: clientId } = config;
  await storage.init();
  let { access_token: accessToken } = await storage.getItem("authData");
  let postData = {
    clientId,
    accessToken,
    pageNo: 1,
    pageSize: 20,
    date: Date.now(),
  };
  try {
    const locksDataRes = await axios.post(
      urls.getLocks,
      qs.stringify(postData),
      axiosConfig.headers
    );
    let {
      data: { list: locks },
    } = locksDataRes;
    await LocksModel.insertMany(locks, { ordered: false });
  } catch (err) {
    console.log(err);
  }

  async function getLockIds() {
    let query = await LocksModel.find({}).select("lockId").exec();
    return query;
  }

  let lockIds = await (await getLockIds()).map((data) => data.lockId);
  let lockIdsPost = lockIds
    .map((id) => ({
      clientId,
      accessToken,
      lockId: id,
      pageNo: 1,
      pageSize: 20,
      date: Date.now(),
    }))
    .map((postData) =>
      axios.post(
        urls.getAllCreatedPasscode,
        qs.stringify(postData),
        axiosConfig
      )
    );

  try {
    const response = await axios.all(lockIdsPost);
    let mappedPasscodeResponse = response
      .map((passcodeData) => passcodeData.data.list)
      .flat();
    console.log(mappedPasscodeResponse);
    await PasscodesModel.insertMany(mappedPasscodeResponse, { ordered: false });
    return res.json({ initialized: true });
  } catch (error) {
    return console.log(error);
    // return res.json({ error: err });
  }
});

router.get("/locks", async (req, res, next) => {
  let locksData = await LocksModel.find({});
  console.log("Lock users model: ", await LockUsersModel.find({}));
  let normalizedData = locksData.map((lockData) => {
    return { [lockData.lockId]: lockData };
  });
  let locksIds = locksData.map((lockData) => lockData.lockId);
  res.json({ byId: Object.assign({}, ...normalizedData), allIds: locksIds });
});

router.get("/passcodes", async (req, res, next) => {
  let passcodesData = await PasscodesModel.find({});
  let normalizedData = passcodesData.map((passcodeData) => {
    return { [passcodeData.keyboardPwdId]: passcodeData };
  });
  let passcodeIds = passcodesData.map(
    (passcodeData) => passcodeData.keyboardPwdId
  );
  res.json({ byId: Object.assign({}, ...normalizedData), allIds: passcodeIds });
});

router.post("/addpasscode", async (req, res, next) => {
  const { client_id: clientId } = config;
  await storage.init();
  let { access_token: accessToken } = await storage.getItem("authData");
  const { lockId, passcode, passcodeName, startDate, endDate } = req.body;

  const postData = qs.stringify({
    clientId,
    accessToken,
    lockId,
    keyboardPwd: passcode,
    keyboardPwdName: passcodeName,
    startDate,
    endDate,
    addType: 2,
    date: Date.now(),
  });

  try {
    const responseData = await axios.post(
      urls.addPasscode,
      postData,
      axiosConfig
    );
    const {
      data: { keyboardPwdId },
    } = responseData;
    if (keyboardPwdId) {
      const rePostData = qs.stringify({
        clientId,
        accessToken,
        lockId,
        pageNo: 1,
        pageSize: 20,
        date: Date.now(),
      });
      try {
        const responseData = await axios.post(
          urls.getAllCreatedPasscode,
          rePostData,
          axiosConfig
        );
        if(!responseData.data.errcode) {
          PasscodesModel.insertMany(responseData.data.list);
          res.status(200).json({ keyboardPwdId });
        }
        else throw new Error(responseData.data.errmsg);
      } catch (error) {
        return res.json(data);
      }
    } else {
       throw new Error(responseData.data.errmsg)
    }
  } catch (err) {
    return res.json({ error: err });
  }
});

router.post("/deletepasscode", async (req, res, next) => {
  const { client_id: clientId } = config;
  await storage.init();
  let { access_token: accessToken } = await storage.getItem("authData");
  const { lockId, keyboardPwdId } = req.body;
  const postData = qs.stringify({
    clientId,
    accessToken,
    lockId,
    keyboardPwdId,
    deleteType: 2,
    date: Date.now(),
  });
  try {
    const response = await axios.post(
      urls.deletePasscode,
      postData,
      axiosConfig
    );
    console.log(response.data);
    if (response.data.errcode === 0) {
      const isDelete = await PasscodesModel.findOneAndDelete({
        keyboardPwdId: keyboardPwdId,
      });
      if (!isDelete) {
        throw new NotFoundError("Passcode NOT_FOUND with id: ", keyboardPwdId);
      } else {
        res.json({
          deletedPasscodeId: keyboardPwdId,
        });
      }
    } else {
      throw new Error(data.errmsg);
    }
  } catch (error) {
    res.json(error);
  }
});

router.post("/addlockuser", async(req, res, next) => {
  console.log(req);
  const { firstName, lastName } = req.body;
  try {
    const isAdded = await LockUsersModel.insertMany({firstName, lastName});
    if(isAdded) {
      res.json({success: `user ${firstName} ${lastName} has been added successfully`});
    } else {
      throw new Error("Error")
    }
  } catch (err) {
    res.json({error: err})
  }
});

module.exports = router;

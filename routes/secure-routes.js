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
  let lockUsersData = await LockUsersModel.find({});
  let normalizedData = locksData.map((lockData) => {
    return { [lockData.lockId]: lockData };
  });
  let normalizedLockUsersData = lockUsersData.map((lockUserData) => {
    return { [lockUserData.id]: lockUserData }
  });
  let lockUserIds = lockUsersData.map((lockUserData) => lockUserData.id);
  let locksIds = locksData.map((lockData) => lockData.lockId);
  res.json({ locks: { byId: Object.assign({}, ...normalizedData), allIds: locksIds }, users: { byId: Object.assign({}, ...normalizedLockUsersData), allIds: lockUserIds } });
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

    console.log("response data from addpasscode endpoint: ", responseData);

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
        if (!responseData.data.errcode) {
          let currentPasscode = responseData.data.list.find(passcode => passcode.keyboardPwdId === keyboardPwdId);
          let isIserted = await PasscodesModel.insertMany(currentPasscode);
          res.json({ keyboardPwdId });

        }
        else throw new Error(responseData.data.errmsg);
      } catch (error) {
        return res.json({error: error});
      }
    } else {
      throw new Error(responseData.data.errmsg);
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

router.post("/addlockuser", async (req, res, next) => {
  const { firstName, lastName } = req.query;
  try {
    const isAdded = await LockUsersModel.insertMany({ firstName, lastName, assignedLockId: null });
    if (isAdded) {
      res.json({ success: `user ${firstName} ${lastName} has been added successfully` });
    } else {
      throw new Error("Error")
    }
  } catch (err) {
    res.json({ error: err })
  }
});


router.post("/assignlock", async (req, res, next) => {
  const { lockUserId, lockId } = req.query;

  const filter = { _id: lockUserId };
  const update = { assignedLockId: lockId };

  let doc = await LockUsersModel.findOneAndUpdate(filter, update, {
    returnOriginal: false
  });
});

router.post("/editpasscode", async (req, res, next) => {
  const { client_id: clientId } = config;
  await storage.init();
  let { access_token: accessToken } = await storage.getItem("authData");
  const { lockId, keyboardPwdId, keyboardPwdName, keyboardPwd, startDate, endDate } = req.body;

  const postData = qs.stringify({
    clientId,
    accessToken,
    lockId,
    keyboardPwdId,
    newKeyboardPwd: keyboardPwd,
    startDate,
    endDate,
    changeType: 2,
    date: Date.now()
  });

  try {
    const response = await axios.post(urls.changePasscode, postData, axiosConfig);
    if (response.data.errcode === 0) {
      const filter = { keyboardPwdId };
      const update = { keyboardPwd, startDate, endDate };
      const passcode = await PasscodesModel.findOneAndUpdate(filter, update, {
        new: true, useFindAndModify: false
      });

      if (passcode.keyboardPwd === keyboardPwd || passcode.startDate === startDate || passcode.endDate === endDate) {
        res.status(200).json({
          status: "success",
          message: "passcode has been updated successfully",
          data: passcode
        });
      }
    }
  } catch (err) {
    return console.log(err);
  }
});

router.post("/getunlockrecords", async (req, res, next) => {
  const { client_id: clientId } = config;
  await storage.init();
  let { access_token: accessToken } = await storage.getItem("authData");
  const { lockId } = req.body;

  const postParams = qs.stringify({
    clientId,
    accessToken,
    lockId,
    pageNo: 1,
    pageSize: 20,
    date: Date.now()
  });

  try {
    const response = await axios.post(urls.getUnlockRecords, postParams, axiosConfig);
    if (response.data.hasOwnProperty("list")) {
      res.status(200).json({ status: "success", data: response.data.list});
    }
  } catch (err) {
    return console.log(err);
  }
});

module.exports = router;

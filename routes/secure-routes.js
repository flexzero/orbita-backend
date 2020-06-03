const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const config = require("../config");
const urls = require("../urls");
const RemoteManage = require("../RemoteManage/RemoteMange");
const storage = require("node-persist");
const equal = require("fast-deep-equal");
const { LocksModel, PasscodesModel, LockUsersModel } = require("../models/model");

const router = express.Router();
const rManager = new RemoteManage();
rManager.init();

router.get("/locks", async (req, res, next) => {
  try {
    let locks = await rManager.getLocks();
    let locksFromDB = await LocksModel.find({}, { _id: 0 });
    if (!equal(locks, locksFromDB)) {
      const removedLocks = await LocksModel.deleteMany({})
      if (removedLocks.ok) {
        await LocksModel.insertMany(locks, { ordered: false });
      }
    }
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
  } catch (err) {
    return next(err)
  }

});

router.get("/passcodes", async (req, res, next) => {
  async function getLockIds() {
    let query = await LocksModel.find({}).select("lockId").exec();
    return query;
  }

  let lockIds = await (await getLockIds()).map((data) => data.lockId);

  try {
    let passcodes = await rManager.getPasscodesFromLocks(lockIds);
    let passcodesFromDB = await PasscodesModel.find({}, { _id: 0 });
    if (!equal(passcodes, passcodesFromDB)) {
      let deletedPasscodes = await PasscodesModel.deleteMany({});
      if (deletedPasscodes.ok) {

        let insertedPasscode = await PasscodesModel.insertMany(passcodes, { ordered: false });
      }
    }
    let passcodesData = await PasscodesModel.find({});
    let normalizedData = passcodesData.map((passcodeData) => {
      return { [passcodeData.keyboardPwdId]: passcodeData };
    });
    let passcodeIds = passcodesData.map(
      (passcodeData) => passcodeData.keyboardPwdId
    );
    res.json({ byId: Object.assign({}, ...normalizedData), allIds: passcodeIds });
  } catch (error) {
    return next(error);
  }
});

router.post("/addpasscode", async (req, res, next) => {

  try {
    const newKeyboardPwdId = await rManager.addPasscode(req.body);
    const { lockId } = req.body;
    const allPasscodes = await rManager.getPasscodesOfLock(lockId);
    const newPasscodeToAdd = allPasscodes.find((passcode) => passcode.keyboardPwdId === newKeyboardPwdId);
    if (newPasscodeToAdd) {
      const isInserted = await PasscodesModel.create(newPasscodeToAdd);
      if (isInserted) {
        res.status(200).send({ keyboardPwdId: newKeyboardPwdId });
      } else {
        throw new Error("failed to add passcode to database");
      }
    } else {
      throw new Error("Passcode not found on server");
    }
  } catch (error) {
    return next(error);
  }
});

router.post("/deletepasscode", async (req, res, next) => {
  const { lockId, keyboardPwdId } = req.body;
  try {
    await rManager.deletePasscode(lockId, keyboardPwdId);
    const isDelete = await PasscodesModel.findOneAndDelete({ keyboardPwdId: keyboardPwdId });
    if (isDelete) {
      res.status(200).send({ deletedPasscodeId: keyboardPwdId });
    } else {
      throw new NotFoundError("Passcode NOT_FOUND with id: ", keyboardPwdId);
    }
  } catch (error) {
    return next(error);
  }
});

router.post("/addlockuser", async (req, res, next) => {
  const { firstName, lastName } = req.query;
  try {
    const isAdded = await LockUsersModel.insertMany({ firstName, lastName, assignedLockId: null });
    if (isAdded) {
      res.json({ success: `user ${firstName} ${lastName} has been added successfully` });
    } else {
      throw new Error("Failed to add lock user.");
    }
  } catch (err) {
    return next(err);
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

  const { lockId, keyboardPwdId, keyboardPwd, startDate, endDate } = req.body;
  try {
    const passcodeUpdateData = await rManager.editPasscode(lockId, keyboardPwdId, keyboardPwd, startDate, endDate);
    const { keyboardPwd: updatedKeyboardPwd, startDate: updatedStartDate, endDate: updatedEndDate } = passcodeUpdateData;
    const filter = { keyboardPwdId };
    const update = { keyboardPwd: updatedKeyboardPwd, startDate: updatedStartDate, endDate: updatedEndDate };
    const updatedPasscode = await PasscodesModel.findOneAndUpdate(filter, update, { new: true, useFindAndModify: false });
    if (updatedPasscode.keyboardPwd === updatedKeyboardPwd, updatedPasscode.startDate === updatedStartDate, updatedPasscode.endDate === updatedEndDate) {
      res.status(200).json({
        status: "success",
        message: "passcode has been updated successfully",
        data: passcode
      });
    } else {
      throw new Error("Unknown Error");
    }
  } catch (error) {
    return next(error);
  }
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
    return next(err);
  }
});

router.post("/getunlockrecords", async (req, res, next) => {
  const { lockId } = req.body;
  try {
    const unlockRecords = await rManager.getUnlockRecords(lockId);
    res.status(200).send({ data: unlockRecords });
  } catch (error) {
    return next(error);
  }
});

router.get("/islockonline", async (req, res, next) => {
  try {
    const gatewaysFromServer = await rManager.getGateways();

  } catch (error) {
    return new Error(error);
  }
});

router.get("/getrooms", async (req, res, next) => {
  /* TODO: fetching the rooms list and store it in local database */
});

router.get("/maproomtolock", async (req, res, next) => {
  /* TODO: mapping the room to a lock */
});
module.exports = router;

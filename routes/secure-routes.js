const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const config = require("../");
const urls = require("../urls");
const RemoteManage = require("../RemoteManage/RemoteMange");
const storage = require("node-persist");
const equal = require("fast-deep-equal");
const fs = require("fs");
const NOW = require("../utils");
const { LocksModel, PasscodesModel, RoomLockMapModel, HotelRoomsModel, ReservationsModel, ScheduledPasscodeModel } = require("../models/model");




const router = express.Router();
const rManager = new RemoteManage();

router.get("/locks", async (req, res, next) => {
  const { user: { _id: requestingUser } } = req;
  try {
    let locks = await rManager.getLocks(requestingUser);
    let locksFromDB = await LocksModel.find({}, { _id: 0 });
    if (!equal(locks, locksFromDB)) {
      const removedLocks = await LocksModel.deleteMany({})
      if (removedLocks.ok) {
        await LocksModel.insertMany(locks, { ordered: false });
      }
    }
    let locksData = await LocksModel.find({});

    let normalizedData = locksData.map((lockData) => {
      return { [lockData.lockId]: lockData };
    });
    let locksIds = locksData.map((lockData) => lockData.lockId);
    res.json({ locks: { byId: Object.assign({}, ...normalizedData), allIds: locksIds } });
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
  const { user: { _id: requestingUser } } = req;
  try {
    const gatewaysFromServer = await rManager.getGateways(requestingUser);
    console.log(gatewaysFromServer);
    res.status(200).send(gatewaysFromServer);
  } catch (error) {
    return new Error(error);
  }
});

router.get("/rooms", async (req, res, next) => {
  const { user: { _id: requestingUser, username } } = req;
  try {
    let roomsFromHotel = await rManager.getRooms(requestingUser);

    roomsFromHotel = roomsFromHotel.map(room => {
      room.user_id = requestingUser;
      room.username = username;
      return room;
    });

    let reservationsFromHotel = await rManager.getReservations(requestingUser);

    let noDeparted = reservationsFromHotel.filter(res => {
      return res.status !== 'Departed';
    });

    let roomLockMapData = await RoomLockMapModel.find({ user_id: requestingUser });

    let roomReservationsMap = roomsFromHotel.map(room => {
      let finded = noDeparted.find(reservation => room.area_id === reservation.room.area_id);
      if (finded) {
        room.res_id = finded.res_id;
        room.nights = finded.nights;
        room.arrive = finded.arrive;
        room.status = finded.status;
        if (finded.status === "Arrived") {
          room.pin_status = "Generated";
        }
      } else {
        room.res_id = null;
        room.nights = null;
        room.arrive = null;
        room.status = null;
      }
      return room;
    }).map(data => {
      let findedMappedLocks = roomLockMapData.find(room => data.area_id === room.area_id);
      if (findedMappedLocks) {
        data.mappedLock = findedMappedLocks.lock_id;
      } else {
        data.mappedLock = null;
      }
      return data;
    });

    let extractedScheduled = roomReservationsMap.filter(rrm => rrm.status !== "Arrived" && rrm.mappedLock !== null).map(es => {
       let { user_id, username, res_id, nights, mappedLock, arrive } = es;
       let schedulingDate = new Date(arrive);
       schedulingDate.setHours(schedulingDate.getHours() - 1);
       schedulingDate.setMinutes(schedulingDate.getMinutes() - schedulingDate.getMinutes());
       schedulingDate = NOW(schedulingDate);
       let endDate = new Date(arrive);
       endDate.setDate(endDate.getDate() + nights);
       endDate = NOW(endDate);
       return { user_id, username, res_id, nights, mappedLock, arrive, startDate: schedulingDate, endDate };
    });

    let scheduledPasscodeDataFromDB = await ScheduledPasscodeModel.find({user_id: requestingUser,}, {_id: 0});

    if(!equal(scheduledPasscodeDataFromDB, extractedScheduled)) {
      await ScheduledPasscodeModel.deleteMany({user_id: requestingUser});
      await ScheduledPasscodeModel.insertMany(extractedScheduled);
    }

    scheduledPasscodeDataFromDB = await ScheduledPasscodeModel.find({user_id: requestingUser,}, {_id: 0});

    roomReservationsMap = roomReservationsMap.map(rrm => {
      let found = scheduledPasscodeDataFromDB.find(spdfd => rrm.res_id === spdfd.res_id);
      if(found) {
        rrm.pin_status = `scheduled on: ${found.startDate}`;
      }
      if(rrm.status !== "Arrived") {
        rrm.pin_status === `No Lock`;
      }
      return rrm;
    })

    let reservationsFromDB = ReservationsModel.find({ user_id: requestingUser }, { _id: 0 });
    if (!equal(roomReservationsMap, reservationsFromDB)) {
      await ReservationsModel.deleteMany({ user_id: requestingUser });
      await ReservationsModel.insertMany(roomReservationsMap);
    }
    let reservations = await ReservationsModel.find({ user_id: requestingUser }, { _id: 0 });
    res.status(200).send({ reservations })
  } catch (error) {
    throw new Error(error);
  }
});

router.post('/maplocktoroom', async (req, res, next) => {
  const { areaId, lockId } = req.query;
  const { user: { _id: requestingUser, username } } = req;
  try {
    const map = await RoomLockMapModel.findOne({ user_id: requestingUser, area_id: areaId });
    if (map === null) {
      await RoomLockMapModel.create({ user_id: requestingUser, username, area_id: areaId, lock_id: lockId });
      res.status(200).send({ status: "success", message: `room id: ${areaId} successfully mapped to lock id: ${lockId}` });
    } else {
      throw new Error(`A lock already mapped to area_id: ${areaId}`);
    }
  } catch (err) {
    throw new Error(err)
  }
});

router.post('/updatelockmap', async (req, res, next) => {
  const { areaId, lockId } = req.query;
  const { user: { _id: requestingUser, username } } = req;
  try {
    const map = await RoomLockMapModel.findOne({ user_id: requestingUser, area_id: areaId });
    if (map !== null) {
      const filter = { user_id: requestingUser, area_id: areaId };
      const update = { lock_id: lockId };
      let updatedData = await RoomLockMapModel.updateOne(filter, update);
      if (updatedData.ok) {
        res.status(200).send({ status: "success", message: `room id: ${areaId} successfully mapped to lock id: ${lockId}` });
      }
    } else {
      throw new Error(`lock map does not exists for room id ${areaId}`);
    }
  } catch (error) {
    throw new Error(error);
  }
})

module.exports = router;

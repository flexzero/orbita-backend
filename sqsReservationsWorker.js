const AWS = require("aws-sdk");
const { Consumer } = require("sqs-consumer");
const RemoteManage = require('./RemoteManage/RemoteMange');
const { resStatuses } = require('./constants');
const mongoose = require('mongoose');
const { ReservationsModel, UserModel, NetfoneAuthModel, ScheduledPasscodeModel } = require('./models/model');
const { NOW } = require("./utils");
require('dotenv').config();

const { env: { PORT, MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_PORT, MONGO_DB_NAME, SQS_REGION, SQS_KEY, SQS_PASSWORD, SQS_URL } } = process;

AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD, apiVersion: "2012-11-05" });

require('dotenv').config();

mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);



let mongoConnectStr = "mongodb+srv://orbita:crazyorbita@cluster1-7rnzb.mongodb.net/orbita-test?retryWrites=true&w=majority";

mongoose.connect(mongoConnectStr, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;


const sqs = new AWS.SQS();
const rManager = new RemoteManage();


const app = Consumer.create({
    queueUrl: SQS_URL,
    messageAttributeNames: ['All'],
    handleMessage: async (message) => {
        let { MessageAttributes:
            { AccountId: { StringValue: account_id },
                AreaId: { StringValue: area_id },
                Arrive: { StringValue: arrive },
                NetfoneCustomer: { StringValue: netfone_customer },
                Nights: { StringValue: nights },
                ResId: { StringValue: res_id },
                Status: { StringValue: status },
                ReservationType: { StringValue: resType }
            }
        } = message;
        console.log(resType);
        switch (status) {
            case resStatuses.STATUS_DEPARTED:
                break;
            case resStatuses.STATUS_CONFIRMED:
                break;
            case resStatuses.STATUS_UNCONFIRMED:
                if (resType !== undefined) {
                    // this is just for the test data
                    // check in the local database if reservation exists or not
                    let isResExists = await isReservationOnDB(res_id);
                    if (!isResExists) {
                        console.log("Reservation does not exists")
                        // if new reservation
                        // check if any existing reservation in the room
                        let isExisting = await isAnyExistingResInRoom(area_id);
                        // we want to proceed to test data if and only if there is no data in db
                        if (!isExisting) {
                            // insert the reservations data

                            // this will get username and id of the user
                            let userData = await getUserFromDB(netfone_customer);
                            let {username, id} = userData;
                            //filter
                            let filter = {area_id}
                            //update data
                            let update = { res_id, nights, arrive, status, username, user_id: id};
                            let updatedData = await ReservationsModel.findOneAndUpdate(filter, update, {new: true});
                            // after updating the data create scheduledPasscode data to the database
                            // if data is updated
                            if(updatedData.res_id === res_id) {
                                // check if scheduled passcode data is exists in the database
                                let scheduledPasscodeExists = await isScheduledPasscodeExists(res_id);
                                if(!scheduledPasscodeExists) {
                                    // find lock id from roomlockmap
                                    
                                    // create a scheduled passcode
                                    let scheduledDateData = await createScheduledPasscodeData({arrive, nights});
                                    let { date, startDate, endDate, startHour } = scheduledDateData;
                                    
                                }   
                            } else {
                                console.log("failed to update reservation");
                            }

                        } else {
                            console.log("This reservation can't be tested");
                        }
                    } else {
                        console.log("This reservation exists");
                    }
                } else {
                    console.log("Actual reservation comes");
                    console.log(account_id, area_id, arrive, netfone_customer, nights, res_id, status, resType);
                }
                break;
            case resStatuses.STATUS_ARRIVED:
                break;
        }
    },
    sqs: new AWS.SQS()
});

app.on('error', (err) => {
    console.error(err.message);
});

app.on('processing_error', (err) => {
    console.error(err.message);
});

app.start()

async function isReservationOnServer(netfone_customer, res_id) {
    let resFromRMS = await rManager.getReservations({ userId: null, userName: netfone_customer });
    if (resFromRMS !== null) {
        let finded = resFromRMS.find(res => res.res_id === res_id);
        if (finded === undefined) {
            return false;
        } else {
            return true;
        }
    }
}

async function isReservationOnDB(res_id) {
    let res = await ReservationsModel.findOne({ res_id });
    if (res === null) {
        return false;
    } else return true;
}

async function isAnyExistingResInRoom(area_id) {
    let res = await ReservationsModel.findOne({ area_id });
    if (res.res_id === null) {
        return false;
    } else {
        return true;
    }
}

async function getUserFromDB(netfoneCustomerName) {
    let netfoneCustomer = await NetfoneAuthModel.findOne({netfoneUsername: netfoneCustomerName});
    let user = await UserModel.findOne({netfoneAuthData: netfoneCustomer._id});
    return { username, _id: id} = user;
}

async function isScheduledPasscodeExists(res_id) {
    let findedScheduledPasscode = await ScheduledPasscodeModel({res_id});
    if(findedScheduledPasscode !== null) {
        return false;
    } else {
        return true;
    }
}

async function createScheduledPasscodeData(schedulingData) {
    let {arrive, nights} = schedulingData;
    let schedulingDate = new Date(arrive);
    let endDate = schedulingDate;
    schedulingDate.setHours(schedulingDate.getHours() - 1);
    schedulingDate.setMinutes(0);
    schedulingDate = NOW(schedulingDate);
    console.log(schedulingDate);
    let [ startDate, startHour ] = schedulingDate.split(" ");
    endDate.setDate(endDate.getDate() + nights);
    endDate = NOW(endDate);
    return { date: arrive, startDate, endDate: endDate, startHour };
}

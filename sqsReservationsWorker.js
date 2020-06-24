const AWS = require("aws-sdk");
const { Consumer } = require("sqs-consumer");
const RemoteManage = require('./RemoteManage/RemoteMange');
const { resStatuses } = require('./constants');
const mongoose = require('mongoose');
const { ReservationsModel, UserModel, NetfoneAuthModel, ScheduledPasscodeModel, RoomLockMapModel, HotelRoomsModel } = require('./models/model');
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
        let resType = undefined;
        let { MessageAttributes:
            { AccountId: { StringValue: account_id },
                AreaId: { StringValue: area_id },
                Arrive: { StringValue: arrive },
                NetfoneCustomer: { StringValue: netfone_customer },
                Nights: { StringValue: nights },
                ResId: { StringValue: res_id },
                Status: { StringValue: status },
            }
        } = message;

        let userData = await getUserFromDB(netfone_customer);
        let { username, id } = userData;

        // if ReservationType exists we know that this is a test reservation
        if (message.MessageAttributes.ReservationType !== undefined) {
            resType = message.MessageAttributes.ReservationType.StringValue;
        }
        switch (status) {
            case resStatuses.STATUS_DEPARTED:
                // check if reservation exists and it's status is only 'arrived'
                let isResExists = await ReservationsModel.findOne({res_id, user_id: id, status: resStatuses.STATUS_ARRIVED});
                if(isResExists !== null) {
                    // if reservation exists delete the reservation and corrospoding scheduled passcode data
                    let scheduledPasscodeId = isResExists.scheduled_passcode;
                    let isScheduledPasscodeDataDeleted = await ScheduledPasscodeModel.findOneAndDelete({_id: scheduledPasscodeId});
                    console.log(isScheduledPasscodeDataDeleted);
                    // delete actual reservation
                    let isResDeleted = await ReservationsModel.findOne({res_id, user_id: id, status: resStatuses.STATUS_ARRIVED});
                    console.log("Reservation has been set to departed status successfully");
                    // 
                } else {
                    console.log("No reservation is found or user have no rights to update the reservation");
                }

                break;
            case resStatuses.STATUS_CONFIRMED:
                if (resType !== undefined) {
                    console.log("reservation with confirmed status comes");
                    // this is just for the test data
                    // check in the local database if reservation exists or not
                    // check if reservation exists on DB and have status 'Unconfirmed'
                    console.log(res_id);
                    let isResExists = await ReservationsModel.findOne({ res_id, user_id: id, status: resStatuses.STATUS_UNCONFIRMED });
                    console.log(isResExists);
                    if (isResExists !== null) {
                        // if the reservation exists we want to update the reservation
                        let filter = { res_id, user_id: id }
                        // adjust the date data 
                        let update = { area_id, status }

                        let isResUpdated = await ReservationsModel.findOneAndUpdate(filter, update, { new: true });
                        if (isResUpdated.area_id === area_id) {

                            // generate passcode 
                            let { startDate, endDate, startHour } = await createScheduledPasscodeData({ arrive, nights });
                            // get mapped lock data
                            let mappedLock = await RoomLockMapModel.findOne({ user_id: id, area_id: area_id });
                            let newScheduledPasscodeData = { res_id, startDate, startHour, endDate, user_id: id, username, arrive, nights,mappedLock: mappedLock.lock_id };
                            let isNewScheduledPasscodeDataInserted = await ScheduledPasscodeModel.create(newScheduledPasscodeData);
                            // update data for reservation
                            let filter = { res_id, user_id: id };
                            let update = { scheduled_passcode: isNewScheduledPasscodeDataInserted._id };
                            // update the reservation record
                            let isReservationUpdated = await ReservationsModel.findOneAndUpdate(filter, update, { new: true });

                        } else {
                            console.log("failed to update reservation");
                        }

                    } else {
                        console.log("No reservation is found or user have no rights to update the reservation");
                    }
                } else {
                    console.log("Actual reservation comes");
                }
                break;
            case resStatuses.STATUS_UNCONFIRMED:
                if (resType !== undefined) {
                    // check for room if exists
                    let room = HotelRoomsModel.findOne({ user_id: id, area_id });
                    if (room !== null) {
                        // check if reservation does not exists
                        console.log("Room exists");
                        let isReservationExistsInDB = await ReservationsModel.findOne({ user_id: id, res_id });
                        console.log(isReservationExistsInDB);
                        if (isReservationExistsInDB === null) {
                            console.log('Creating a new reservation...');
                            // if it does not exist we are good to go
                            // create reservations data
                            // check if reservation exist on a room

                            let newReservationsData = { res_id, user_id: id, username, nights, arrive, status };
                            let insert = await ReservationsModel.create(newReservationsData);
                            console.log(insert)
                        }
                        else {
                            console.log("Reservation exists")
                        }
                    } else {
                        console.log("Room does not exists and not to this owner");
                    }
                } else {
                    console.log("Actual reservation comes");
                    // pushBackToSQS({ account_id, area_id, arrive, nights, netfone_customer, res_id, status });
                }
                break;
            case resStatuses.STATUS_ARRIVED:
                if(resType !== undefined) {
                    console.log("reservation with status arrived comes");
                     // find the reservation
                     let reservation = await ReservationsModel.findOne({ res_id, status: resStatuses.STATUS_CONFIRMED, user_id: id});
                     if(reservation !== null) {
                         // find and update
                         let find = { res_id, status: resStatuses.STATUS_CONFIRMED, user_id: id};
                         let update = { status: resStatuses.STATUS_ARRIVED };
                         let isDataUpdated = await ReservationsModel.findOneAndUpdate(find, update, { new: true});
                         if(isDataUpdated.status === resStatuses.STATUS_ARRIVED) {
                             console.log("Reservation status changed to Arrived successfully");
                         }
                     } else {
                         console.log("Reservation does not exists or user have no rights to update reservation");
                     }
                } else {
                    console.log("Actual reservation with status arrived");
                }
                break;
        }
    },
    sqs
});

app.on('error', (err) => {
    console.log(err);
    console.error(err.message);
});

app.on('processing_error', (err) => {
    console.log(err);
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


async function getUserFromDB(netfoneCustomerName) {
    let netfoneCustomer = await NetfoneAuthModel.findOne({ netfoneUsername: netfoneCustomerName });
    let user = await UserModel.findOne({ netfoneAuthData: netfoneCustomer._id });
    return { username, _id: id } = user;
}

async function isScheduledPasscodeExists(res_id) {
    let findedScheduledPasscode = await ScheduledPasscodeModel({ res_id });
    if (findedScheduledPasscode !== null) {
        return false;
    } else {
        return true;
    }
}

async function createScheduledPasscodeData(schedulingData) {
    let { arrive, nights } = schedulingData;
    let schedulingDate = new Date(arrive);
    let endDate = new Date(arrive);
    schedulingDate.setHours(schedulingDate.getHours() - 1);
    schedulingDate.setMinutes(0);
    schedulingDate = NOW(schedulingDate);
    console.log(schedulingDate);
    let [startDate, startHour] = schedulingDate.split(" ");
    endDate.setDate(endDate.getDate() + nights);
    endDate = NOW(endDate);
    return { startDate, endDate, startHour };
}

async function pushBackToSQS(sqsData) {
    const { area_id, arrive, nights, netfone_customer, status, account_id, area_name, res_id } = sqsData;

    let params = {
        MessageAttributes: {
            "NetfoneCustomer": {
                DataType: "String",
                StringValue: netfone_customer,
            },
            "AccountId": {
                DataType: "String",
                StringValue: account_id
            },
            "ResId": {
                DataType: "Number",
                StringValue: res_id,
            },
            "Nights": {
                DataType: "Number",
                StringValue: nights,
            },
            "AreaId": { DataType: "String", StringValue: area_id },
            "Arrive": { DataType: "String", StringValue: arrive },
            "Status": { DataType: "String", StringValue: status },
        },
        MessageBody: "Information about reservation to be added",
        QueueUrl: SQS_URL,
    }

    try {
        let isDataPushed = await sqs.sendMessage(params).promise();
    } catch (error) {
        console.error(error);
    }
}

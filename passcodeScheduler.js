const AWS = require('aws-sdk');
const schedule = require('node-schedule');
const mongoose = require("mongoose");
const NOW = require("./utils");
require('dotenv').config();

const { ScheduledPasscodeModel, PasscodesModel } = require("./models/model");

const passcodeScheduleSQSURL = "https://sqs.ap-southeast-2.amazonaws.com/825974424523/orbita_passcode";

mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

const { env: { SQS_REGION, SQS_KEY, SQS_PASSWORD } } = process;

let mongoConnectStrRoot = ``

//Connection string for the orbita-project mongodb
let mongoConnectStr = "mongodb+srv://orbita:crazyorbita@cluster1-7rnzb.mongodb.net/orbita-test?retryWrites=true&w=majority";

AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD });
let sqs = new AWS.SQS({ apiVersion: "2012-11-05" })


// This is the how the script will connect to project-orbita's mongodb
mongoose.connect(mongoConnectStr, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;


let scheduledPasscodes = [
    {
        mappedLock: "1862957",
        arrive: "2020-06-17 13:00:00",
        nights: 1,
        startDate: "2020-06-18",
        startHour: "12:00:00",
        endDate: "2020-10-18 17:00:00",
        user_id: "5ee8b233ce253b54a8066e4a",
        username: "orbita",
        res_id: "10334"
    },
    {
        mappedLock: "1862957",
        arrive: "2020-06-17 12:00:00",
        nights: 1,
        startDate: "2020-06-18",
        startHour: "11:00:00",
        endDate: "2020-10-18 17:00:00",
        user_id: "5ee8b233ce253b54a8066e4a",
        username: "orbita",
        res_id: "1083"
    },
    {
        mappedLock: "1862957",
        arrive: "2020-06-17 11:00:00",
        nights: 1,
        startDate: "2020-06-17",
        startHour: "12:00:00",
        endDate: "2020-10-18 17:00:00",
        user_id: "5ee8b233ce253b54a8066e4a",
        username: "orbita",
        res_id: "10393"
    },
    {
        mappedLock: "1862957",
        arrive: "2020-10-13 14:00:00",
        nights: 1,
        startDate: "2020-10-13",
        startHour: "13:00:00",
        endDate: "2020-10-14 14:00:00",
        user_id: "5ee8b233ce253b54a8066e4a",
        username: "orbita",
        res_id: "13639"
    }, {
        mappedLock: "1862941",
        arrive: "2020-07-14 14:00:00",
        nights: 3,
        startDate: "2020-07-14",
        startHour: "13:00:00",
        endDate: "2020-07-17 14:00:00",
        user_id: "5ee8b233ce253b54a8066e4a",
        username: "orbita",
        res_id: "14518"
    }, {

        mappedLock: 1862953,
        arrive: "2020-10-01 21:17:00",
        nights: 1,
        startDate: "2020-10-01",
        startHour: "20:00:00",
        endDate: "2020-10-02 21:17:00",
        user_id: "5ee8b233ce253b54a8066e4a",
        username: "orbita",
        res_id: "13714"
    }
];


const pushToSQS = async (data) => {
    const { mappedLock, arrive, nights, startDate, startHour, endDate, user_id, username, res_id } = data;
    let params = {
        MessageAttributes: {
            "mappedLockId": {
                DataType: "String",
                StringValue: mappedLock,
            },
            "arrive": {
                DataType: "String",
                StringValue: arrive
            },
            "nights": {
                DataType: "Number",
                StringValue: String(nights),
            },
            "startDate": { DataType: "String", StringValue: startDate },
            "startHour": { DataType: "String", StringValue: startHour },
            "endDate": { DataType: "String", StringValue: endDate },
            "user_id": { DataType: "String", StringValue: user_id },
            "username": {
                DataType: "String", StringValue: username
            },
            "res_id": { DataType: "String", StringValue: res_id },
        },
        MessageBody: "Information about passcodes to be added",
        QueueUrl: passcodeScheduleSQSURL
    }

    let isDataPushed = await sqs.sendMessage(params).promise();
    console.log(isDataPushed);
}


const job = schedule.scheduleJob('0 */1 * * * *', async function () {
    let todaysDate = new Date();
    todaysDate.setMinutes(0);
    todaysDate.setSeconds(0)
    todaysDate = NOW(todaysDate);
    let [dateFilter, hourFilter] = todaysDate.split(" ");
    let passcodeToScheduleNow = scheduledPasscodes.filter((SP => {
        return SP.startDate === dateFilter
    }));

    passcodeToScheduleNow.forEach(PTSN => {
        if (PTSN.startHour === hourFilter) {
            pushToSQS(PTSN);
        } else {
        }
    });
});



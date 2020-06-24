const AWS = require('aws-sdk');
const schedule = require('node-schedule');
const mongoose = require("mongoose");
const { NOW } = require("./utils");
require('dotenv').config();

const { ScheduledPasscodeModel, PasscodesModel } = require("./models/model");

const passcodeScheduleSQSURL = "https://sqs.ap-southeast-2.amazonaws.com/825974424523/orbita_passcode";

const { env: { SQS_REGION, SQS_KEY, SQS_PASSWORD } } = process;

//Connection string for the orbita-project mongodb
let mongoConnectStr = "mongodb+srv://orbita:crazyorbita@cluster1-7rnzb.mongodb.net/orbita-test?retryWrites=true&w=majority";

// This is the how the script will connect to project-orbita's mongodb
mongoose.connect(mongoConnectStr, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;

mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD });
let sqs = new AWS.SQS({ apiVersion: "2012-11-05" })


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
    if (isDataPushed.MessageId) {
        console.log("data has been pushed to SQS");
    }
}


const job = schedule.scheduleJob('0 */1 * * * *', async function () {

    let todaysDate = new Date();
    todaysDate.setMinutes(0);
    todaysDate.setSeconds(0)
    todaysDate = NOW(todaysDate);
    let [dateFilter, hourFilter] = todaysDate.split(" ");
    let scheduledPasscodes = await ScheduledPasscodeModel.find({ startDate: dateFilter });
    console.log(scheduledPasscodes);
    let passcodeToScheduleNow = scheduledPasscodes.filter((SP => {
        return SP.startDate === dateFilter
    }));

    console.log("Hello...");

    passcodeToScheduleNow.forEach(PTSN => {
        if (PTSN.startHour === hourFilter) {
            console.log('generating passcode');
            //pushToSQS(PTSN);
        } else {
        }
    });
});



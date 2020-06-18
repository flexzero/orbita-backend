const AWS = require("aws-sdk");
const { Consumer } = require("sqs-consumer");
const RemoteManage = require("./RemoteManage/RemoteMange");
const { generateRandomPasscode } = require('./utils');
const mongoose = require('mongoose');
require('dotenv').config();


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

const { env: { SQS_REGION, SQS_KEY, SQS_PASSWORD} } = process;

const passcodeScheduleSQSURL = "https://sqs.ap-southeast-2.amazonaws.com/825974424523/orbita_passcode";

AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD, apiVersion: "2012-11-05" });

const app = Consumer.create({
    queueUrl: passcodeScheduleSQSURL,
    messageAttributeNames: ['mappedLockId', 'arrive', 'nights', 'startDate', 'startHour', 'endDate', 'endHour', 'user_id', 'username', 'res_id'],
    handleMessage: async (message) => {
        let rManage = new RemoteManage();

        try {
            let { MessageAttributes:messageAttr } = message;
            let { 
                arrive: { StringValue: arrive }, 
                endDate: { StringValue: endDate },
                mappedLockId: { StringValue: lockId },
                nights: { StringValue: nights },
                res_id: { StringValue: res_id},
                user_id: { StringValue: user_id },
                username: { StringValue: username }, 
            } = messageAttr;

            let startDate = new Date(arrive).getTime();
            endDate = new Date(endDate).getTime();
            let passcode = generateRandomPasscode();
            let passcodeName = "test passcode";
            let generatedPasscode = await rManage.addPasscode({startDate, endDate, passcode, passcodeName, lockId}, user_id);
            console.log("generated passcode: ", generatedPasscode);
        } catch(error) {
            console.error(error);
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


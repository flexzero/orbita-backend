const AWS = require("aws-sdk");
const { Consumer } = require("sqs-consumer");
require('dotenv').config();


const { env: { SQS_REGION, SQS_KEY, SQS_PASSWORD} } = process;

const passcodeScheduleSQSURL = "https://sqs.ap-southeast-2.amazonaws.com/825974424523/orbita_passcode";

AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD, apiVersion: "2012-11-05" });

const app = Consumer.create({
    queueUrl: passcodeScheduleSQSURL,
    handleMessage: async (message) => {
        console.log(message);
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


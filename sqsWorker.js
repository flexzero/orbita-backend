const AWS = require("aws-sdk");
const { Consumer } = require("sqs-consumer");
require('dotenv').config();


const { env: { SQS_REGION, SQS_KEY, SQS_PASSWORD, SQS_URL } } = process;

const amqp = require('amqplib/callback_api');
const CONN_URL = 'amqp://localhost';

let ch = null;

amqp.connect(CONN_URL, function (err, conn) {
    conn.createChannel(function (error, channel) {
        ch = channel;
    });
});
AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD, apiVersion: "2012-11-05" });

const app = Consumer.create({
    queueUrl: SQS_URL,
    handleMessage: async (message) => {
        // do some work with `message`
        let msg = message.Body;
        ch.sendToQueue('reservations', Buffer.from(JSON.stringify(msg)));
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


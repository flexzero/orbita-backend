const AWS = require("aws-sdk");
const publishToQueue = require("./MQService");
require('dotenv').config();


const { env: { SQS_REGION, SQS_KEY, SQS_PASSWORD, SQS_URL } } = process;

const amqp = require('amqplib/callback_api');
const CONN_URL = 'amqp://localhost';

let ch = null;

amqp.connect(CONN_URL, function(err, conn) {
    conn.createChannel(function(error, channel) {
        ch = channel;
    });
});
AWS.config.update({ region: SQS_REGION, accessKeyId: SQS_KEY, secretAccessKey: SQS_PASSWORD });
let sqs = new AWS.SQS({ apiVersion: "2012-11-05" });

async function sqsConsumer() {
    let sqsQueueMessages = await sqs.receiveMessage({QueueUrl: SQS_URL}).promise();
    let message = sqsQueueMessages.Messages[0].Body;
    ch.sendToQueue('reservations', Buffer.from(JSON.stringify(message)));
}

sqsConsumer();


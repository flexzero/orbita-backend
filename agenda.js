const Agenda = require('agenda');

require('dotenv').config();

const { env: { PORT, MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_PORT, MONGO_DB_NAME, SQS_REGION, SQS_KEY, SQS_PASSWORD, SQS_URL } } = process;

let mongoConnectStr = "";

MONGO_USERNAME === "" && MONGO_PASSWORD === "" ? mongoConnectStr = `mongodb://${MONGO_HOST}:${MONGO_PORT}/agenda`
    : mongoConnectStr = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/agenda`;
    
const agenda = new Agenda({db: { address: mongoConnectStr}});

module.exports = agenda;
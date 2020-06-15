const Bull = require("bull");
const mongoose = require("mongoose");
const { ScheduledPasscodeModel } =  require("./models/model");

require('dotenv').config();

mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

const { env: { MONGO_HOST, MONGO_USERNAME, MONGO_PASSWORD, MONGO_PORT, MONGO_DB_NAME} } = process;

let mongoConnectStr = "";

MONGO_USERNAME === "" && MONGO_PASSWORD === "" ? mongoConnectStr = `mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}`
  : mongoConnectStr = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}`;

mongoose.connect(mongoConnectStr, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;

const passcodeQueue = new Bull('passcodeQueue');

(async () => {
    console.log(await ScheduledPasscodeModel.find({}));
})();

let main = async () => {
    const job = await passcodeQueue.add({
        command: 'GENERATE_PASSCODE',
   }, {
        repeat: {
          every: 10000,
        }
   });
}

passcodeQueue.process(async job => {
    try {
        // TODO: check if there is an passcode scheduled to generated today
        // check if it should be done in current hour
        // if yes generate the passcode and mail the customer using node mailer
    } catch (error) {
        console.log(error);
    }
});

passcodeQueue.on('completed', job => {
    console.log(`Job with id ${job.id} has been completed`);
});

main();
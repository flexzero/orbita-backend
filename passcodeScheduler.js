const schedule = require('node-schedule');
const mongoose = require("mongoose");

const { ScheduledPasscodeModel } = require("./models/model");

// Setting mongo parameters, so that deprecated mongodb functions dont required
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);

let mongoConnectStrRoot = ``

const GENERATE_PASSCODE_EVERY_MINUTE = "generate passcode every minute";
const GENERATE_PASSCODE_EVERY_HOUR = "generate passcode every hour";

//Connection string for the orbita-project mongodb
let mongoConnectStr = "mongodb+srv://orbita:crazyorbita@cluster1-7rnzb.mongodb.net/orbita-test?retryWrites=true&w=majority";

//Conection string for the agenda task scheduler
let agendaMongoConnectStr = "mongodb+srv://orbita:crazyorbita@cluster1-7rnzb.mongodb.net/agenda?retryWrites=true&w=majority";

// This is the how the script will connect to project-orbita's mongodb
mongoose.connect(mongoConnectStr, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", (error) => console.log(error));
mongoose.Promise = global.Promise;


const job = schedule.scheduleJob('0 */1 * * * *', function() {
});

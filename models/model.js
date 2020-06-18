const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const schema = mongoose.Schema;

const UserSchema = new schema({
  username: {
    type: String,
    requierd: true,
    unique: true,
  },
  password: {
    type: String,
    requierd: true,
  },
  ttlockAuthData: { type: mongoose.Schema.Types.ObjectId, ref: 'TTLockAuth' },
  netfoneAuthData: { type: mongoose.Schema.Types.ObjectId, ref: 'NetfoneAuth' }
});

const LocksSchema = new schema({
  date: {
    type: Number,
    required: true,
  },
  specialValue: {
    type: Number,
    required: true,
  },
  lockAlias: {
    type: String,
    required: true,
    unique: true,
  },
  noKeyPwd: {
    type: Number,
  },
  lockMac: {
    type: String,
    required: true,
    unique: true,
  },
  passageMode: {
    type: Number,
  },
  timezoneRawOffset: {
    type: Number,
  },
  lockId: {
    type: Number,
    required: true,
    unique: true,
  },
  featureValue: {
    type: String,
  },
  electricQuantity: {
    type: Number,
    required: true,
  },
  lockData: {
    type: String,
    required: true,
  },
  keyboardPwdVersion: {
    type: Number,
    required: true,
  },
  wirelessKeypadFeatureValue: {
    type: String,
  },
  lockVersion: {
    showAdminKbpwdFlag: {
      type: Boolean,
    },
    groupId: { type: Number },
    protocolVersion: { type: Number },
    protocolType: { type: Number },
    orgId: { type: Number },
    logoUrl: { type: String },
    scene: { type: Number },
  },
  lockName: {
    type: String,
    required: true,
    unique: true,
  },
  user: { type: mongoose.Types.ObjectId, ref: "Users" }
}, { versionKey: false });

const PasscodesScheam = new schema({
  lockId: { type: Number, required: true },
  keyboardPwdVersion: { type: Number, required: true },
  endDate: { type: Number, required: true },
  sendDate: { type: Number, required: true },
  keyboardPwdName: { type: String },
  keyboardPwdId: { type: Number, required: true, unique: true },
  keyboardPwd: { type: String, required: true },
  keyboardPwdType: { type: Number, requierd: true },
  startDate: { type: Number, require: true },
  receiverUsername: { type: String, require: true },
  status: { type: Number, require: true },
  user: { type: mongoose.Types.ObjectId, ref: "Users" }
}, { versionKey: false });

const GatewaySchema = new schema({
  gatewayId: { type: Number, require: true },
  gatewayMac: { type: String, required: true },
  gatewayVersion: { type: Number, required: true },
  networkName: { type: String, required: true },
  lockNum: { type: Number, required: true },
  isOnline: { type: Number, required: true }
}, { versionKey: false });

const TTLockAuthDataSchema = new schema({
  ttlockUsername: { type: String, required: true },
  ttlockPassword: { type: String, required: true },
  client_id: { type: String, required: true },
  client_secret: { type: String, required: true },
  redirect_uri: { type: String, required: true },
  access_token: { type: String, required: false, default: null },
  refresh_token: { type: String, required: false, default: null, },
  uid: { type: Number, required: false, default: null },
  openid: { type: Number, required: false, default: null },
  scope: { type: String, required: false, default: null },
  token_type: { type: String, required: false, default: null },
  expires_in: { type: Number, required: false, default: null },
  loggedin_at: { type: Number, require: false, default: null }
});

const NetfoneAuthDataSchema = new schema({
  netfoneUsername: { type: String, required: true },
  netfonePassword: { type: String, required: true },
  accessToken: { type: String, required: false, default: null },
  loggedin_at: { type: String, required: false, default: null },
});

const HotelRoomsSchema = new schema({
  user_id: { type: mongoose.Types.ObjectId, ref: "Users" },
    username: { type: String, require: true },
  area: { type: String, required: true, unique: true },
  area_id: { type:String, required: true, unique: true },
  cat_id: { type: Number, required: false, default: null },
  
}, {versionKey: false});

const ReservationsDataSchema = new schema({
    area: { type: String, required: true, unique: true},
    mappedLock: { type: String, required: false, default: null, sparse: true},
    area_id: { type: String, required: true, unique: true},
    user_id: { type: mongoose.Types.ObjectId, ref: "Users" },
    username: { type: String, require: true },
    res_id: { type: String, required: false, unique: true, default: null, sparse: true},
    nights: { type: String, required: false, default: null},
    arrive: { type: String, required: false, default: null},
    pin_status: { type: String, required: false, default: null },
    total_rate: { type: String, required: false, default: null},
    status: { type: String, required: false, default: null}
}, { versionKey: false, ObjectId: false, _id: false, id: false});

const RoomLockMap = new schema({
  user_id: {  type: mongoose.Types.ObjectId, ref: "Users"},
  username: { type: String, require: true },
  area_id: { type: String, default: null },
  lock_id: { type: String, default: null },
});

const ScheduledPasscode = new schema({
  user_id: {  type: mongoose.Types.ObjectId, ref: "Users"},
  username: { type: String, required: false },
  res_id: { type: String, required: true},
  date: {type: String, require: true},
  mappedLock: { type: String, required: true, default: null },
  arrive: { type: String, default: null},
  nights: { type: Number, default: null},
  startDate: { type: String, required: true, default: null},
  endDate: { type: String, required: true, default: null},

});

UserSchema.pre("save", async function (next) {
  const user = this;

  const hash = await bcrypt.hash(this.password, 10);

  this.password = hash;

  next();
});

UserSchema.methods.isValidPassword = async function (password) {
  const user = this;

  const compare = await bcrypt.compare(password, user.password);
  return compare;
};

const UserModel = mongoose.model("Users", UserSchema);
const LocksModel = mongoose.model("Locks", LocksSchema);
const PasscodesModel = mongoose.model("Passcodes", PasscodesScheam);
const GatewayModel = mongoose.model("Gateways", GatewaySchema);
const TTLockAuthModel = mongoose.model('TTLockAuth', TTLockAuthDataSchema);
const NetfoneAuthModel = mongoose.model('NetfoneAuth', NetfoneAuthDataSchema);
const ReservationsModel = mongoose.model('Reservations', ReservationsDataSchema);
const HotelRoomsModel = mongoose.model('Rooms', HotelRoomsSchema);
const RoomLockMapModel = mongoose.model('RoomLockMap', RoomLockMap);
const ScheduledPasscodeModel = mongoose.model('ScheduledPasscode', ScheduledPasscode);

module.exports = { UserModel, LocksModel, PasscodesModel, GatewayModel, TTLockAuthModel, NetfoneAuthModel, ReservationsModel, HotelRoomsModel, RoomLockMapModel, ScheduledPasscodeModel };

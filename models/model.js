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
  ttlockAuthData: {type: mongoose.Schema.Types.ObjectId, ref: 'TTLockAuth'},
  netfoneAuthData: {type: mongoose.Schema.Types.ObjectId, ref: 'NetfoneAuth'}
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
  user: { type: mongoose.Types.ObjectId, ref: "Users"}
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
  user: { type: mongoose.Types.ObjectId, ref: "Users"}
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
  ttlockUsername: { type: String, required: true},
  ttlockPassword: { type: String, required: true},
  client_id: { type: String, required: true },
  client_secret: { type: String, required: true },
  access_token: { type: String, required: false, default: null  },
  refresh_token: { type: String, required: false, default: null, },
  uid: { type: Number, required: false,  default: null },
  openid: { type: Number, required: false, default: null },
  scope: { type: String, required: false, default: null },
  token_type: { type: String, required: false, default: null },
  expires_in: { type: Number, required: false, default: null },
  loggedin_at: { type: Number, require: false, default: null }
});

const NetfoneAuthDataSchema = new schema({
  netfoneUsername: { type: String, required: true},
  netfonePassword: { type: String, required: true},
  accessToken: { type: String, required: false, default: null },
  loggedin_at: { type: String, required: false, default: null },
});

const ReservationsDataSchema = new schema({
   NetfoneCustomer: { type: String, required: true},
   AccountId: { type: Number, required: true},
   ResId: { type: Number, required: true },
   AreaId: { type: Number, require: true },
   AreaName: { type: String, required: true},
   Status: { type: String, required: true }
});


const HotelRoomsSchema = new schema({
  area: { type: Number, required: true},
  area_id: { type: Number, required: true},
  cat_id: {type: Number, required: true}
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

module.exports = { UserModel, LocksModel, PasscodesModel, GatewayModel, TTLockAuthModel, NetfoneAuthModel, ReservationsModel, HotelRoomsModel };

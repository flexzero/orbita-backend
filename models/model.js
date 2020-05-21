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
}, {versionKey: false });

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
}, { versionKey: false });

const GatewaySchema = new schema({
  gatewayId: { type: Number, require: true},
  gatewayMac: { type: String, required: true},
  gatewayVersion: { type: Number, required: true},
  networkName: { type: String, required: true },
  lockNum: { type: Number, required: true},
  isOnline: { type: Number, required: true}
}, {versionKey: false});

const LockUsersSchema = new schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  assignedLockId: { type: Number }
})

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

const UserModel = mongoose.model("user", UserSchema);
const LocksModel = mongoose.model("locks", LocksSchema);
const PasscodesModel = mongoose.model("passcodes", PasscodesScheam);
const LockUsersModel = mongoose.model("lockusers", LockUsersSchema);
const GatewayModel = mongoose.model("gateways", GatewaySchema);

module.exports = { UserModel, LocksModel, PasscodesModel, LockUsersModel, GatewaySchema };

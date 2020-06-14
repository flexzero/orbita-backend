const urls = {
  getAccessToken: "https://api.ttlock.com/oauth2/token",
  getLocks: "https://api.ttlock.com/v3/lock/list",
  getAllCreatedPasscode: "https://api.ttlock.com/v3/lock/listKeyboardPwd",
  getElectricQuantity: "https://api.ttlock.com/v3/lock/queryElectricQuantity",
  addPasscode: "https://api.ttlock.com/v3/keyboardPwd/add",
  deletePasscode: "https://api.ttlock.com/v3/keyboardPwd/delete",
  changePasscode: "https://api.ttlock.com/v3/keyboardPwd/change",
  getUnlockRecords: "https://api.ttlock.com/v3/lockRecord/list",
  getGateways: "https://api.ttlock.com/v3/gateway/list",
  netfoneGraphQL: "https://api.netfone.io/graphql",
};

module.exports = urls;

class Store {
  locks = {
    locksData: {
      byId: {},
      allIds: [],
    },
  };
  isRecievedLocksData = false;
  isRecievedPasscodesData = false;
  initialized = false;
  passcodes = { passcodesData: { byId: {}, allIds: [] } };
  gateways = { gatewaysData: { byId: {}, allIds: [] } };

  constructor() {}

  addLocks(locksData) {
    let byId = this.locks.locksData.byId;
    let allIds = this.locks.locksData.allIds;
    let normalizedLocksData = locksData.map((lock, i) => {
      return { [lock.lockId]: { ...lock } };
    });
    let allLockIds = locksData.map((lock, i) => lock.lockId);
    this.locks.locksData.byId = Object.assign(byId, ...normalizedLocksData);
    this.locks.locksData.allIds = this.comparatorPopulator(allIds, allLockIds);
  }

  comparatorPopulator(oldIds, newIds) {
    let allIds = [...oldIds, ...newIds];
    return([...new Set(allIds)]);
  }

  getLocks() {
    return this.locks;
  }

  getPasscodes() {
    return this.passcodes;
  }

  updateElectricQuantity(eqData) {
    for(let data in eqData) {
      if(this.locks.locksData.byId[data.lockId]) {
        this.locks.locksData.byId[data.lockId].electricQuantity = eqData.electricQuantity;
      }
    }
  }

  deletePasscode(id) {
    delete this.passcodes.passcodesData.allIds[id];
    delete this.passcodes.passcodesData.byId[id];
  }

  setIsRecievedLocksData() {
    this.isRecievedLocksData = true;
  }

  unsetIsRecievedLocksData() {
    this.isRecievedLocksData = false;
  }

  getIsRecievedLocksData() {
    return this.isRecievedLocksData;
  }

  setIsRecievedPasscodesData() {
    this.isRecievedPasscodesData = true;
  }

  getIsRecievedPasscodesData() {
    return this.isRecievedPasscodesData;
  }

  getIsRecievedLocksData() {
    return this.isRecievedLocksData;
  }

  unsetIsRecievedLocksData() {
    return this.isRecievedPasscodesData;
  }

  setInitialized() {
    this.initialized = true;
  }

  unsetInitialized() {
    this.initialized = false;
  }

  getInitialized() {
    return this.initialized;
  }

  getLocksAndPasscodeData() {
    return({locks: this.locks, passcodes: this.passcodes});
  }

  addPasscodes(passcodesData) {
    let byId = this.passcodes.passcodesData.byId;
    let allIds = this.passcodes.passcodesData.allIds;

    let normalizedPasscodesData = passcodesData.map((passcode, i) => ({
      [passcode.keyboardPwdId]: { ...passcode },
    }));
    let allPasscodeIds = passcodesData.map((passcode, i) => passcode.keyboardPwdId);
    this.passcodes.passcodesData.byId = Object.assign(
      byId,
      ...normalizedPasscodesData
    );
    this.passcodes.passcodesData.allIds = this.comparatorPopulator(allIds, allPasscodeIds);
  }
}

module.exports = Store;

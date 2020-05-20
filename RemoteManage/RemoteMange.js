const config = require("../config");
const axios = require("axios");
const qs = require("querystring");
const urls = require("../urls");
const storage = require("node-persist");
class RemoteManage {
    constructor() {
        this.axiosConfig = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        };
        const { client_id: clientId } = config;
        this.clientId = clientId;

    }

    async init() {
        await storage.init();
        let { access_token: accessToken } = await storage.getItem("authData");
        this.accessToken = accessToken;
    }


    isError(response) {

        if (response !== undefined) {
            if (response['errcode'] === undefined) {
                return false;
            } else if (response['errcode'] !== undefined && response['errcode'] == 0) {
                return false;
            }
            return true;
        }
    }

    async getLocks() {
        try {
            let postData = qs.stringify({
                clientId: this.clientId,
                accessToken: this.accessToken,
                pageNo: 1,
                pageSize: 20,
                date: Date.now()
            });

            const response = await axios.post(
                urls.getLocks,
                postData,
                this.axiosConfig
            );

            if (!this.isError(response.data)) {
                const { data: { list: locks } } = response;
                return locks;
            } else {
                throw new Error(response.data.errmsg)
            }
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    }

    async getPasscodesFromLocks(lockIds) {
        const { clientId, accessToken } = this;
        const lockIdsPost = lockIds
            .map((id) => ({
                clientId,
                accessToken,
                lockId: id,
                pageNo: 1,
                pageSize: 100,
                date: Date.now()
            }))
            .map((dataToPost) => axios.post(
                urls.getAllCreatedPasscode,
                qs.stringify(dataToPost),
                this.axiosConfig
            ));
        try {
            const responses = await axios.all(lockIdsPost);
            for (let response of responses) {
                if (this.isError(response.data)) throw new Error(response.data.errmsg);
            }
            const passcodesLists = responses.map((response) => response.data.list).flat();
            return passcodesLists;
        } catch (error) {
            throw new Error(error);
        }
    }

    async addPasscode(postData) {
        const { lockId, passcode, passcodeName, startDate, endDate } = postData;



        const dataToPost = qs.stringify({
            clientId: this.clientId,
            accessToken: this.accessToken,
            lockId,
            keyboardPwd: passcode,
            keyboardPwdName: passcodeName,
            startDate,
            endDate,
            date: Date.now(),
        });

        try {
            const response = await axios.post(
                urls.addPasscode,
                dataToPost,
                this.axiosConfig
            );

            console.log("The response: ", response.data);

            if (!this.isError(response.data)) {
                const { data: { keyboardPwdId } } = response;
                return keyboardPwdId;
            }
            else {
                throw new Error(response.data.errmsg);
            }
        } catch (error) {
            console.log(error);
            throw new Error(error);
        }
    }

    async getPasscodesOfLock(lockId) {
        const { clientId, accessToken } = this;
        const dataToPost = qs.stringify({
            clientId,
            accessToken,
            lockId,
            pageNo: 1,
            pageSize: 20,
            date: Date.now()
        });

        try {
            const response = await axios.post(urls.getAllCreatedPasscode, dataToPost, this.axiosConfig);
            if (!this.isError(response.data)) {
                return response.data.list;
            }
            else
                throw new Error(response.data.errmsg)
        } catch (error) {
            throw new Error(error)
        }
    }

    async deletePasscode(lockId, keyboardPwdId) {
        const { clientId, accessToken } = this;
        const dataToPost = qs.stringify({
            clientId,
            accessToken,
            lockId,
            keyboardPwdId,
            deleteType: 2,
            date: Date.now()
        });
        try {
            const response = await axios.post(urls.deletePasscode, dataToPost, this.axiosConfig);
            console.log(response);
            if (!this.isError(response.data)) {
                return;
            } else {
                throw new Error(response.data.errmsg);
            }
        } catch (error) {
            console.log("error: ", error);
            throw new Error(error);
        }
    }

    async getUnlockRecords(lockId) {
        const { clientId, accessToken } = this;

        const dataToPost = qs.stringify({
            clientId,
            accessToken,
            lockId,
            pageNo: 1,
            pageSize: 20,
            date: Date.now()
        });

        try {

            const response = await axios.post(urls.getUnlockRecords, dataToPost, this.axiosConfig);
            if (!this.isError(response.data)) {
                const { data: { list } } = response;
                return list;
            } else throw new Error(response.data.errmsg);

        } catch (error) {
            throw new Error(error);
        }
    }
}

module.exports = RemoteManage;
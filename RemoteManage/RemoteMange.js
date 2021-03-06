const axios = require("axios");
const qs = require("querystring");
const urls = require("../urls");
const md5 = require("md5");
const { UserModel, TTLockAuthModel, NetfoneAuthModel } = require("../models/model");


class RemoteManage {
    constructor() {
        this.axiosConfig = {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        };
    }

    async identifyUser(userId) {
        try {
            let currentUser = await UserModel.findOne({ _id: userId });
            let currentUserTTLockAcc = await TTLockAuthModel.findOne({ _id: currentUser.ttlockAuthData });
            let currentUserNetfoneAcc = await NetfoneAuthModel.findOne({ _id: currentUser.netfoneAuthData });
            let { client_id: clientId, access_token: TTLockAccessToken } = currentUserTTLockAcc;
            let { accessToken: netfoneAccessToken } = currentUserNetfoneAcc;
            return {
                ttlockAuthData: {
                    clientId,
                    TTLockAccessToken
                },
                netfoneAuthData: {
                    netfoneAccessToken
                }
            }
        } catch (error) {
            throw new Error(error);
        }
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

    async getLocks(requestingUser) {
        let authData = await this.identifyUser(requestingUser);
        const { ttlockAuthData: { clientId, TTLockAccessToken: accessToken } } = authData;
        try {
            let postData = qs.stringify({
                clientId,
                accessToken,
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

    async getPasscodesFromLocks(lockIdsc) {
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
            if (!this.isError(response.data)) {
                return;
            } else {
                throw new Error(response.data.errmsg);
            }
        } catch (error) {
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

    async editPasscode(lockId, keyboardPwdId, keyboardPwd, startDate, endDate) {
        const { clientId, accessToken } = this;

        const dataToPost = qs.stringify({
            clientId,
            accessToken,
            lockId,
            keyboardPwdId,
            newKeyboardPwd: keyboardPwd,
            startDate,
            endDate,
            changeType: 2,
            date: Date.now(),
        })

        try {
            const response = await axios.post(urls.changePasscode, dataToPost, this.axiosConfig);
            if (!this.isError(response.data)) {
                return { keyboardPwd, startDate, endDate };
            } else {
                throw new Error(response.data.errmsg);
            }
        } catch (error) {
            throw new Error(error);
        }
    }

    async getGateways(requestingUser) {
        let authData = await this.identifyUser(requestingUser);
        console.log("authData: ", authData);
        const { ttlockAuthData: { clientId, TTLockAccessToken: accessToken } } = authData;

        const dataToPost = qs.stringify({
            clientId,
            accessToken,
            pageNo: 1,
            pageSize: 100,
            date: Date.now()
        });
        try {
            const response = await axios.post(urls.getGateways, dataToPost, this.axiosConfig);
            console.log("The data: ", response.data);
            if (!this.isError(response)) return response.data.list;
            else throw new Error(response.data.errmsg);
        } catch (error) {
            throw new Error(response.data.errmsg);
        }
    }


    async getRooms(userId) {
        let authData = await this.identifyUser(userId);
        const { netfoneAuthData: { netfoneAccessToken: accessToken } } = authData;

        const header = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        }
        const dataToPost = JSON.stringify({
            query: 'query {\n    getRooms {\n        area\n        area_id\n        cat_id\n    }\n}',
            variables: {}
        });

        try {
            const response = await axios.post(urls.netfoneGraphQL, dataToPost, header);
            const { data: { data: { getRooms: rooms } } } = response;
            return rooms;
        } catch (error) {
            throw new Error(error);
        }
    }

    async getReservations(userId) {
        let authData = await this.identifyUser(userId);
        const { netfoneAuthData: {  netfoneAccessToken: accessToken } } = authData;

        const header = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        }

        const dataToPost = JSON.stringify({
            query: 'query ($input: ReservationsGetInput!) {\n    getReservations(input: $input) {\n        res_id\n        room {\n            area\n            area_id\n        }\n        nights\n        arrive\n        total_rate\n        status\n    }\n}',
            variables: {"input":{"created_from":"2020-02-22T17:11:57+00:00"}
        }});

        try {
            const response = await axios.post(urls.netfoneGraphQL, dataToPost, header);
            let {data: { data: { getReservations }}} = response;
            return getReservations;
        } catch (error) {
            throw new Error(error);
        }
    }
}

module.exports = RemoteManage;
var md5 = require('md5');

const config = {
    client_id: "783abdfaacaa4074829e79e5b62d6198",
    client_secret: "7e6f190ec49573e6282d4eb5a6210b52",
    grant_type: "password",
    username: "+6421403471",
    password: md5("Ghost2"),
    redirect_uri: "http://pradeeps.dev",
}

module.exports = config;
import Koa from 'koa';
import mount from 'koa-mount';
import mongodb from 'koa-mongo';
import convert from 'koa-convert';

import {SSO} from '../../koa2-sdk';

var app = new Koa();

var auth = {
    logout: function() {
        console.log("logout");
    },
    loginByUserId: function(userid) {
        console.log("login");
        return true;
    }
};

const mongo = convert(mongodb({
    dbname: 'shoots-sdk-test',
    uri: "mongodb://127.0.0.1/shoots-sdk-test",
    max: 100,
    min: 1,
    timeout: 30000,
    log: false
}));

app.use(mongo);

app.use(async function(ctx, next) {
    ctx.auth = auth;
    await next();
});

var options = {
    client_id: process.env.ID, //企业+应用的ID
    secret: process.env.SECRET, //企业+应用的SECRET
    redirect_url: process.env.REDIRECT_URL, //企业+应用主页地址
    sso_auth_url: process.env.SSO_AUTH_URL, //企业+的SSO认证地址
    sso_callback_url: process.env.SSO_AUTH_CALLBACK_URL, //应用的回调地址
    home_host: process.env.HOMEHOST //企业+的home地址
};

var sso = new SSO(options);
app.use(mount('/sso', sso));

app.use(ctx => {
    ctx.body = 'Hello Koa';
});

module.exports = app;

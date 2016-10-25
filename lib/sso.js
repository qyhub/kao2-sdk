import Koa from 'koa';
import Router from 'koa-router';
import request from 'request';
import Debug from 'debug';

import util from './util';
import sync from './sync';

var debug = Debug('koa2-sdk');

module.exports = function(options) {

    let router = new Router();
    let sso = new Koa();

    let clientId = options.client_id;
    let appSecret = options.secret;
    let redirectUrl = options.redirect_url;
    let authCallbackUrl = options.sso_callback_url;
    let ssoUri = options.sso_auth_url || 'https://qyhub.cn/serv/sso/auth';
    let homeHost = options.home_host || 'https://qyhub.cn';


    debug(options);

    sso.use(async function(ctx, next) {
        ctx.ajax = function(options) {
            return new Promise(function(resolve, reject) {
                request(options, function(error, response, body) {
                    if (error) return reject(error);
                    resolve(response);
                })
            });
        };

        await next();
    })
    router.get('/auth', async function(ctx, next) {
        let url = ssoUri + '?client_id=' + clientId + '&redirect_uri=' + redirectUrl + '&callback=' + authCallbackUrl;
        console.log('redirect to', url);
        ctx.status = 301;
        ctx.redirect(url);
    });

    router.get('/callback', async function(ctx, next) {
        debug('==> call callback');
        await ctx.auth.logout();
        let token = ctx.query.token;
        let redirect_uri = ctx.query.redirect_uri;
        console.log(appSecret, token);
        let playload = util.unsign(token, appSecret);

        if (!playload) {
            debug('error token');
            ctx.body = '错误的token';
            return;
        }
        let expires_at = playload.ts;
        let now = new Date().getTime();
        if (now > expires_at) {
            debug('token was expire');
            ctx.body = '访问链接已经超时过期';
            return;
        }

        let userid = playload.userid;
        let userId = null;
        let users = ctx.mongo.collection('users');

        debug("同步用户");
        let result = await sync.getSyncUsers({
            eid: playload.eid,
            appId: clientId,
            appSecret: appSecret,
            homeHost: homeHost
        }, ctx);
        debug("同步用户 result=", result);

        let user = await users.findOne({
            userid: userid,
            isdeleted: {
                $ne: 1
            }
        });

        if (!user) {
            console.log('invalid user', userid, user);
            ctx.status = 403;
            ctx.body = '非法用户';
            return;
        }

        console.log('auto login by userid', user.userid);
        result = await ctx.auth.loginByUserId(user.userid, false, 0);
        console.log('auto login result', result);
        if (result) {
            ctx.status = 301;
            debug('redirect_uri', redirect_uri);
            ctx.body = '正在跳转到首页...';
            return ctx.redirect(redirect_uri);
        }
    });


    sso.use(router.routes());
    sso.use(router.allowedMethods());
    return sso;
};

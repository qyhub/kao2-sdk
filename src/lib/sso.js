var Koa = require('koa');
var Router = require('koa-router');
var request = require('request');
var debug = require('debug')('koa2-sdk');
var Url = require('url');

var util = require('./util');
var sync = require('./sync');


module.exports = function(options) {

    var router = new Router();
    var sso = new Koa();

    var clientId = options.client_id;
    var appSecret = options.secret;
    var redirectUrl = options.redirect_url;
    var authCallbackUrl = options.sso_callback_url;
    var ssoUri = options.sso_auth_url || 'https://qyhub.cn/serv/sso/auth';
    var homeHost = options.home_host || 'https://qyhub.cn';


    debug(options);

    var auth = async function(ctx, next) {
        if (ctx.querystring) {
            if (redirectUrl.indexOf('?') > 0) {
                redirectUrl += ctx.querystring;
            } else {
                redirectUrl += '?' + ctx.querystring;
            }
        }
        var url = ssoUri + '?client_id=' + clientId + '&redirect_uri=' + redirectUrl + '&callback=' + authCallbackUrl;
        console.log('redirect to', url);
        ctx.status = 301;
        ctx.redirect(url);
    }

    router.get('/auth', auth);

    router.get('/callback', async function(ctx, next) {
        debug('==> call callback');
        await ctx.auth.logout();
        var token = ctx.query.token;
        var redirect_uri = ctx.query.redirect_uri;
        console.log(appSecret, token);
        var playload = util.unsign(token, appSecret);

        if (!playload) {
            debug('error token');
            ctx.body = '错误的token';
            return;
        }
        var expires_at = playload.ts;
        var now = new Date().getTime();
        if (now > expires_at) {
            debug('token was expire');
            ctx.body = '访问链接已经超时过期';
            return;
        }

        var userid = playload.userid;
        var userId = null;
        var users = ctx.mongo.collection('users');
        var url = Url.parse(redirect_uri);
        var sid = url.sid || null;
        debug("同步用户");
        var result = await sync.getSyncUsers({
            eid: playload.eid,
            sid: sid,
            appId: clientId,
            appSecret: appSecret,
            homeHost: homeHost
        }, ctx);
        debug("同步用户 result=", result);

        var user = await users.findOne({
            userid: userid,
            isdevared: {
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

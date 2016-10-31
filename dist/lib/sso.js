'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var Koa = require('koa');
var Router = require('koa-router');
var request = require('request');
var debug = require('debug')('koa2-sdk');

var util = require('./util');
var sync = require('./sync');

module.exports = function (options) {

    var router = new Router();
    var sso = new Koa();

    var clientId = options.client_id;
    var appSecret = options.secret;
    var redirectUrl = options.redirect_url;
    var authCallbackUrl = options.sso_callback_url;
    var ssoUri = options.sso_auth_url || 'https://qyhub.cn/serv/sso/auth';
    var homeHost = options.home_host || 'https://qyhub.cn';

    debug(options);

    var auth = function () {
        var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(ctx, next) {
            var url;
            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            url = ssoUri + '?client_id=' + clientId + '&redirect_uri=' + redirectUrl + '&callback=' + authCallbackUrl;

                            console.log('redirect to', url);
                            ctx.status = 301;
                            ctx.redirect(url);

                        case 4:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this);
        }));

        return function auth(_x, _x2) {
            return _ref.apply(this, arguments);
        };
    }();

    router.get('/auth', auth);

    router.get('/callback', function () {
        var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(ctx, next) {
            var token, redirect_uri, playload, expires_at, now, userid, userId, users, result, user;
            return regeneratorRuntime.wrap(function _callee2$(_context2) {
                while (1) {
                    switch (_context2.prev = _context2.next) {
                        case 0:
                            debug('==> call callback');
                            _context2.next = 3;
                            return ctx.auth.logout();

                        case 3:
                            token = ctx.query.token;
                            redirect_uri = ctx.query.redirect_uri;

                            console.log(appSecret, token);
                            playload = util.unsign(token, appSecret);

                            if (playload) {
                                _context2.next = 11;
                                break;
                            }

                            debug('error token');
                            ctx.body = '错误的token';
                            return _context2.abrupt('return');

                        case 11:
                            expires_at = playload.ts;
                            now = new Date().getTime();

                            if (!(now > expires_at)) {
                                _context2.next = 17;
                                break;
                            }

                            debug('token was expire');
                            ctx.body = '访问链接已经超时过期';
                            return _context2.abrupt('return');

                        case 17:
                            userid = playload.userid;
                            userId = null;
                            users = ctx.mongo.collection('users');


                            debug("同步用户");
                            _context2.next = 23;
                            return sync.getSyncUsers({
                                eid: playload.eid,
                                appId: clientId,
                                appSecret: appSecret,
                                homeHost: homeHost
                            }, ctx);

                        case 23:
                            result = _context2.sent;

                            debug("同步用户 result=", result);

                            _context2.next = 27;
                            return users.findOne({
                                userid: userid,
                                isdevared: {
                                    $ne: 1
                                }
                            });

                        case 27:
                            user = _context2.sent;

                            if (user) {
                                _context2.next = 33;
                                break;
                            }

                            console.log('invalid user', userid, user);
                            ctx.status = 403;
                            ctx.body = '非法用户';
                            return _context2.abrupt('return');

                        case 33:

                            console.log('auto login by userid', user.userid);
                            _context2.next = 36;
                            return ctx.auth.loginByUserId(user.userid, false, 0);

                        case 36:
                            result = _context2.sent;

                            console.log('auto login result', result);

                            if (!result) {
                                _context2.next = 43;
                                break;
                            }

                            ctx.status = 301;
                            debug('redirect_uri', redirect_uri);
                            ctx.body = '正在跳转到首页...';
                            return _context2.abrupt('return', ctx.redirect(redirect_uri));

                        case 43:
                        case 'end':
                            return _context2.stop();
                    }
                }
            }, _callee2, this);
        }));

        return function (_x3, _x4) {
            return _ref2.apply(this, arguments);
        };
    }());

    sso.use(router.routes());
    sso.use(router.allowedMethods());
    return sso;
};

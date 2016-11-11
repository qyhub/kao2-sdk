'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var debug = require('debug')('koa2-sdk');

var Sync = {};

Sync.getToken = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(params, ctx) {
        var homeHost, appId, appSecret, get_token_url, result;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        debug("==> Sync.getToken", params);
                        homeHost = params.homeHost;
                        appId = params.appId;
                        appSecret = params.appSecret;
                        get_token_url = homeHost + '/api/getToken?appid=' + appId + '&appsecret=' + appSecret;
                        _context.next = 7;
                        return ctx.ajax({
                            method: 'GET',
                            url: get_token_url,
                            resolveWithFullResponse: true,
                            forever: false,
                            json: true
                        });

                    case 7:
                        result = _context.sent;
                        return _context.abrupt('return', result.body);

                    case 9:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, this);
    }));

    return function (_x, _x2) {
        return _ref.apply(this, arguments);
    };
}();

Sync.getSyncUsers = function () {
    var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(params, ctx) {
        var homeHost, appId, eid, ts, tokenInf, getUsers, tokenInfo, userColl, usercount, get_user_url, post, response, result, data, users, i, user;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        debug('==> Sync.getSyncUsers', params);
                        homeHost = params.homeHost;
                        appId = params.appId;
                        eid = params.eid;
                        ts = params.ts || null;
                        tokenInf = {
                            token: null,
                            time: null
                        };
                        getUsers = [];
                        _context2.next = 9;
                        return Sync.getToken(params, ctx);

                    case 9:
                        tokenInfo = _context2.sent;

                        if (!(tokenInfo && tokenInfo.errcode === 0)) {
                            _context2.next = 46;
                            break;
                        }

                        userColl = ctx.mongo.collection('users');

                        if (ts) {
                            _context2.next = 17;
                            break;
                        }

                        _context2.next = 15;
                        return userColl.count({
                            eid: eid,
                            isdevared: {
                                $ne: true
                            }
                        });

                    case 15:
                        usercount = _context2.sent;

                        if (usercount === 0) {
                            debug('==> 用户为0,同步所有用户');
                            ts = new Date('2016-06-06').getTime();
                        }

                    case 17:
                        get_user_url = homeHost + '/api/get_sync_app_user?access_token=' + tokenInf.token;
                        post = {
                            eid: eid,
                            appid: appId
                        };


                        if (params.sid) {
                            post.sid = sid;
                        }

                        if (ts) {
                            post.ts = ts;
                        }
                        debug('==>get user from ', get_user_url, post);
                        _context2.next = 24;
                        return ctx.ajax({
                            method: 'POST',
                            uri: get_user_url,
                            resolveWithFullResponse: true,
                            body: post,
                            forever: false,
                            json: true
                        });

                    case 24:
                        response = _context2.sent;
                        result = response.body;

                        if (!(result && result.errcode === 0)) {
                            _context2.next = 45;
                            break;
                        }

                        data = result.data;

                        if (!(data && data.need_sync_users)) {
                            _context2.next = 38;
                            break;
                        }

                        users = data.need_sync_users;
                        i = 0;

                    case 31:
                        if (!(i < users.length)) {
                            _context2.next = 38;
                            break;
                        }

                        user = users[i];
                        _context2.next = 35;
                        return userColl.update({
                            userid: user.userid
                        }, {
                            $set: user
                        }, {
                            upsert: true
                        });

                    case 35:
                        i++;
                        _context2.next = 31;
                        break;

                    case 38:

                        debug("==> 删除已经删除的用户,保留这些用户", data.userids);

                        if (!(data && data.userids && data.userids.length > 0)) {
                            _context2.next = 45;
                            break;
                        }

                        debug("==> 删除已经删除的用户,保留这些用户", data.userids);
                        _context2.next = 43;
                        return userColl.update({
                            eid: eid,
                            userid: {
                                $nin: data.userids
                            }
                        }, {
                            $set: {
                                isdevared: true
                            }
                        }, {
                            multi: true
                        });

                    case 43:
                        result = _context2.sent;

                        debug("==> 删除用户返回", result.result);

                    case 45:
                        return _context2.abrupt('return', true);

                    case 46:
                        debug('==> 获取token为空');
                        return _context2.abrupt('return', false);

                    case 48:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, _callee2, this);
    }));

    return function (_x3, _x4) {
        return _ref2.apply(this, arguments);
    };
}();
module.exports = Sync;

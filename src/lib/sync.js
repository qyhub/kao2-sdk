var debug =require('debug')('koa2-sdk');

var Sync = {};

Sync.getToken = async function(params, ctx) {
    debug("==> Sync.getToken", params);
    var homeHost = params.homeHost;
    var appId = params.appId;
    var appSecret = params.appSecret;

    var get_token_url = homeHost + '/api/getToken?appid=' + appId + '&appsecret=' + appSecret;

    var result = await ctx.ajax({
        method: 'GET',
        url: get_token_url,
        resolveWithFullResponse: true,
        forever: false,
        json: true
    });
    return result.body;
}

Sync.getSyncUsers = async function(params, ctx) {
    debug('==> Sync.getSyncUsers', params);
    var homeHost = params.homeHost;
    var appId = params.appId;
    var eid = params.eid;
    var ts = params.ts || null;

    var tokenInf = {
        token: null,
        time: null
    };
    var getUsers = [];
    var tokenInfo = await Sync.getToken(params, ctx);

    if (tokenInfo && tokenInfo.errcode === 0) {
        var userColl = ctx.mongo.collection('users');
        if (!ts) {
            var usercount = await userColl.count({
                eid: eid,
                isdevared: {
                    $ne: true
                }
            });
            if (usercount === 0) {
                debug('==> 用户为0,同步所有用户');
                ts = new Date('2016-06-06').getTime();
            }
        }
        var get_user_url = homeHost + '/api/get_sync_app_user?access_token=' + tokenInf.token;


        var post = {
            eid: eid,
            appid: appId
        };
        if (ts) {
            post.ts = ts;
        }
        debug('==>get user from ', get_user_url, post);
        var response = await ctx.ajax({
            method: 'POST',
            uri: get_user_url,
            resolveWithFullResponse: true,
            body: post,
            forever: false,
            json: true
        });
        var result = response.body;
        if (result && result.errcode === 0) {
            var data = result.data;
            if (data && data.need_sync_users) {
                var users = data.need_sync_users;
                for (var i = 0; i < users.length; i++) {
                    var user = users[i];
                    await userColl.update({
                        userid: user.userid
                    }, {
                        $set: user
                    }, {
                        upsert: true
                    });
                }

            }

            debug("==> 删除已经删除的用户,保留这些用户", data.userids);
            if (data && data.userids && data.userids.length > 0) {
                debug("==> 删除已经删除的用户,保留这些用户", data.userids);
                result = await userColl.update({
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
                debug("==> 删除用户返回", result.result);
            }
        }
        return true;
    }
    debug('==> 获取token为空');
    return false;
}
module.exports = Sync;

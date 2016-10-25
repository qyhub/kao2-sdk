import Debug from 'debug';
var debug = Debug('koa2-sdk');

var Sync = {};

Sync.getToken = async function(params, ctx) {
    debug("==> Sync.getToken", params);
    let homeHost = params.homeHost;
    let appId = params.appId;
    let appSecret = params.appSecret;

    let get_token_url = homeHost + '/api/getToken?appid=' + appId + '&appsecret=' + appSecret;

    let result = await ctx.ajax({
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
    let homeHost = params.homeHost;
    let appId = params.appId;
    let eid = params.eid;
    let ts = params.ts || null;

    let tokenInf = {
        token: null,
        time: null
    };
    let getUsers = [];
    let tokenInfo = await Sync.getToken(params, ctx);

    if (tokenInfo && tokenInfo.errcode === 0) {
        let userColl = ctx.mongo.collection('users');
        if (!ts) {
            let usercount = await userColl.count({
                eid: eid,
                isdeleted: {
                    $ne: true
                }
            });
            if (usercount === 0) {
                debug('==> 用户为0,同步所有用户');
                ts = new Date('2016-06-06').getTime();
            }
        }
        let get_user_url = homeHost + '/api/get_sync_app_user?access_token=' + tokenInf.token;


        let post = {
            eid: eid,
            appid: appId
        };
        if (ts) {
            post.ts = ts;
        }
        debug('==>get user from ', get_user_url, post);
        let response = await ctx.ajax({
            method: 'POST',
            uri: get_user_url,
            resolveWithFullResponse: true,
            body: post,
            forever: false,
            json: true
        });
        let result = response.body;
        if (result && result.errcode === 0) {
            var data = result.data;
            if (data && data.need_sync_users) {
                var users = data.need_sync_users;
                for (let i = 0; i < users.length; i++) {
                    let user = users[i];
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
                        isdeleted: true
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

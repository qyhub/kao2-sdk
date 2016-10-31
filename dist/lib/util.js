'use strict';

var jwt = require('jwt-simple');
module.exports = {
    unsign: function unsign(token, secret) {
        return jwt.decode(token, secret);
    },
    sign: function sign(payload, secret) {
        return jwt.encode(payload, secret);
    }
};

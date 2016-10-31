var jwt=require('jwt-simple');
module.exports = {
    unsign: function(token, secret) {
        return jwt.decode(token, secret);
    },
    sign: function(payload, secret) {
        return jwt.encode(payload, secret);
    }
}

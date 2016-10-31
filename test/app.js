require('babel-polyfill');

require('babel-core/register')({
  presets: ['es2015-node5', 'stage-3']
});



var app = require('./sso');

console.log("listen port",3000);
app.listen(3000);

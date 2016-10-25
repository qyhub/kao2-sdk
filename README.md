# 企业+ kao2-sdk

> 单点登录,自动同步增量用户

# 使用方法

1. 安装

  `npm install koa2-sdk --save`

2. 使用

  ```javascript
  import {SSO} from 'koa2-sdk';
  let options={
   client_id: process.env.ID, //企业+应用的ID
   secret: process.evn.SECRET, //企业+应用的SECRET
   redirect_url: process.env.REDIRECT_URL, //企业+应用主页地址
   sso_callback_url: process.env.SSO_AUTH_CALLBACK_URL,//企业+应用的回调地址
  };
  let sso=new SSO(options);
  app.use(mount('/sso',sso));
  ```

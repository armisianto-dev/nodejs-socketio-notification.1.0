var mysqlAR = require('mysql-activerecord');
var conAR = mysqlAR.Adapter({
  server: 'localhost',
  username: 'root',
  password: '',
  database: 'notification_api_v1_db',
  reconnectTimeout: 2000
});

module.exports = conAR;
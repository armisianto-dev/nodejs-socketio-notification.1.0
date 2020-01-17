'use strict';

var connection = require('../../conn')
var microtime = require('microtime')

// JWT
const jwt = require('jsonwebtoken')
const jwtKey = 'arm1$I4nt0!??'
const jwtAlgorithm = 'HS256'
const jwtExpiry = '1d'

exports.gen_microtime = function () {
  return microtime.now();
}

exports.get_currdatetime = function () {
  var today = new Date();
  return today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' ' + today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
}

exports.gen_user_id = async function () {
  var today = new Date();
  var prefixDate = today.getFullYear() + '' + ((today.getMonth() + 1) < 10 ? '0' : '') + (today.getMonth() + 1);
  var params = prefixDate + '%';

  let rows = await findLastNumber(params);

  if (!rows.length) {
    return prefixDate.toString() + '0001';
  } else {
    var data = rows[0];
    let lastNum = parseInt(data.last_number);
    let nextNum = lastNum + 1;

    if (nextNum > 9999) {
      return false;
    } else {
      var pad = '0000';
      var newNum = pad.substring(0, pad.length - nextNum.toString().length) + nextNum.toString();
      return (prefixDate.toString() + '' + newNum.toString());
    }
  }
}

function findLastNumber(params) {
  return new Promise(resolve => {
    var sql = "SELECT RIGHT(user_id, 4)'last_number' FROM com_user WHERE user_id LIKE ? ORDER BY user_id DESC LIMIT 1";
    connection.query(sql, [params], function (errors, rows, fields) {
      if (errors) {
        console.log("Error query")
      } else {
        resolve(rows)
      }
    })
  })
}

exports.curr_datetime = function (options) {
  var today = new Date();

  var year = today.getFullYear();
  var month = ((today.getMonth() + 1) < 10 ? '0' : '') + (today.getMonth() + 1);
  var day = (today.getDate() < 10 ? '0' : '') + today.getDate();

  var hours = (today.getHours() < 10 ? '0' : '') + today.getHours();
  var minutes = (today.getMinutes() < 10 ? '0' : '') + today.getMinutes();
  var seconds = (today.getSeconds() < 10 ? '0' : '') + today.getSeconds();

  if (options == '' || options == 'datetime' || !options) {
    return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
  } else if (options == 'date') {
    return year + '-' + month + '-' + day;
  } else if (options == 'time') {
    return hours + ':' + minutes + ':' + seconds;
  }
}

exports.get_user_id_by_token = async function (token) {
  return await findUserIDByToken(token);
}

function findUserIDByToken(token) {
  return new Promise(resolve => {
    var jwtResult;
    try {
      jwtResult = jwt.verify(token, jwtKey, {
        algorithm: jwtAlgorithm,
        expiresIn: jwtExpiry,
      });

      var sql = "SELECT a.user_id ";
      sql += " FROM com_user a ";
      sql += " LEFT JOIN com_user_social b ON a.user_id = b.user_id AND b.provider = ? ";
      sql += " WHERE a.user_id = ? ";

      connection.query(sql, [jwtResult.provider, jwtResult.user], function (error, result) {
        if (error) {
          console.log("Error query")
          resolve({
            status: false,
            user_id: null
          })
        } else {
          if (!result.length) {
            resolve({
              status: false,
              user_id: null
            })
          } else {
            resolve({
              status: true,
              user_id: result[0].user_id
            })
          }
        }
      })

    } catch {
      resolve({
        status: false,
        user_id: null
      })
    }
  })
}
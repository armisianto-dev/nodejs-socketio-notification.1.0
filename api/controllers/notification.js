'use strict'

var helper = require('../models/helper')
var encryption = require('../models/encryption')
var response = require('../../res')
var connection = require('../../conn')
var connectionAR = require('../../conn-ar')
var validation = require('node-input-validator')

// Push Notification
exports.pushNotification = function (data, callback) {
    var notification_id = helper.gen_microtime() ;

    var params = {
        notification_id: notification_id,
        title: data.title,
        message: data.message,
        link: data.link,
        client_id: data.client_id,
        group_id: data.group_id,
        create_date: helper.get_currdatetime()
    }

    connectionAR.insert('trx_notification', params, function (err) {
        if (err) {
            return callback(true, null);
        } else {
            // Get Top Notification
            var sql = 'SELECT * FROM trx_notification WHERE client_id = ? AND read_st = "unread" ORDER BY create_date DESC LIMIT 5';
            connection.query(sql, [data.client_id], function (errors, rows, fields) {
                if (errors) {
                    return callback(true, null)
                } else {
                    var dataNotification = {
                        totalNotification: rows.length,
                        listNotification: rows
                    }

                    return callback(false, dataNotification)
                }
            })
        }
    })
}

// Load Notification
exports.loadNotification = function (data, callback) {

    // Get Top Notification
    var sql = 'SELECT * FROM trx_notification WHERE client_id = ? AND read_st = "unread" ORDER BY create_date DESC LIMIT 5';
    connection.query(sql, [data.client_id], function (errors, rows, fields) {
        if (errors) {
            return callback(true, null)
        } else {
            var dataNotification = {
                totalNotification: rows.length,
                listNotification: rows
            }

            return callback(false, dataNotification)
        }
    })
}
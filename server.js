var express = require('express'),
    socket = require('socket.io'),
    app = express(),
    port = process.env.PORT || 3000,
    server = require('http').createServer(app),
    io = socket.listen(server);

server.listen(port, function () {
    console.log('Server listening on port %d', port);
});


// Controller API
var conNotification = require('./api/controllers/notification')
io.on('connection', function (socket) {
    socket.on('join', function (client_id) {
        console.log('User : ' + client_id + ' join');
        socket.join(client_id);
    });

    socket.on('notification added', function (data) {

        conNotification.pushNotification(data, function (error, result) {
            if (error) {
                io.emit('error');
            } else {
                io.to(data.client_id).emit('new notification', result);
            }

        })

    });

    socket.on('notification load', function (data) {

        conNotification.loadNotification(data, function (error, result) {
            if (error) {
                io.emit('error');
            } else {
                io.to(data.client_id).emit('new notification', result);
            }

        })

    });

    socket.on('notification read', function (data) {
        conNotification.readNotification(data, function (error, result) {
            if (error) {
                io.emit('error');
            } else {
                io.to(data.client_id).emit('new notification', result);
            }
        })
    })
});
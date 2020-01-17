'use strict';

exports.ok = function (data, message, res) {
  var data = {
    'status': true,
    'code': 200,
    'message': message,
    'errors': null,
    'data': data
  };
  res.status(200).json(data);
  res.end();
};

exports.error = function (message, errors, res) {
  var data = {
    'status': false,
    'code': 400,
    'messages': message,
    'errors': errors,
    'data': null
  };
  res.status(400).json(data);
  res.end();
};

exports.notFound = function (message, res) {
  var data = {
    'status': false,
    'code': 404,
    'messages': message,
    'errors': null,
    'data': null
  };
  res.status(404).json(data);
  res.end();
};

exports.unauthorized = function (message, res) {
  var data = {
    'status': false,
    'code': 401,
    'messages': message,
    'errors': null,
    'data': null
  };
  res.status(401).json(data);
  res.end();
};
'use strict';

const crypto = require('crypto');
const algorithm = 'aes-256-cbc';

exports.encrypt = function (text) {
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  let cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {
    key: key.toString('hex'),
    iv: iv.toString('hex'),
    encryptedData: encrypted.toString('hex')
  };
}

exports.decrypt = function (text) {
  let key = Buffer.from(text.key, 'hex');
  let iv = Buffer.from(text.iv, 'hex');
  let encryptedText = Buffer.from(text.encryptedData, 'hex');
  let decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
'use strict'

var helper = require('../models/helper')
var encryption = require('../models/encryption')
var response = require('../../res')
var connection = require('../../conn')
var connectionAR = require('../../conn-ar')
var validation = require('node-input-validator')

// JWT
const jwt = require('jsonwebtoken')
const jwtKey = 'arm1$I4nt0!??'
const jwtAlgorithm = 'HS256'
const jwtExpiry = '1d'

// Update Password
exports.updatePassword = function (req, res) {
  var user_id = req.params.user_id
  var password = req.body.password
  var encrypted = encryption.encrypt(password)

  var sql =
    'UPDATE com_user SET user_pass = ?, user_key = ?, user_iv = ? WHERE user_id = ? '
  connection.query(
    sql,
    [encrypted.encryptedData, encrypted.key, encrypted.iv, user_id],
    function (error, rows, fields) {
      if (error) {
        if (error.code == 'ER_EMPTY_QUERY') {
          var message = 'Password failed to change'
          response.notFound(message, res)
        }
      } else {
        var message = 'Password change'
        response.ok(rows, message, res)
      }
    }
  )
}

// Login
exports.signIn = function (req, res) {
  // Validation Input
  let validator = new validation(req.body, {
    email: 'required|email',
    password: 'required',
  })

  validator.check().then(function (matched) {
    if (!matched) {
      response.error('Login Gagal', validator.errors, res)
    } else {
      // Get Auth
      var sql = 'SELECT * FROM com_user a WHERE a.user_name = ? '
      connection.query(sql, [req.body.email], function (error, rows, fields) {
        if (error) {
          var message = 'Login Gagal : Username/email tidak terdaftar'
          response.unauthorized(message, res)
          res.end()
        } else {
          if (!rows.length) {
            var message = 'Login Gagal : Username/email tidak terdaftar'
            response.unauthorized(message, res)
            res.end()
          } else {
            var data = rows[0]
            // Check Password
            if (
              req.body.password ==
              encryption.decrypt({
                key: data.user_key,
                iv: data.user_iv,
                encryptedData: data.user_pass,
              })
            ) {
              // Login Berhasil
              var user_id = data.user_id
              const token = jwt.sign({
                  user: user_id,
                  provider: 'MANUAL',
                },
                jwtKey, {
                  algorithm: jwtAlgorithm,
                  expiresIn: jwtExpiry,
                }
              )

              res.cookie('token', token, {
                maxAge: 1000 * 3600 * 24,
              })

              var message = 'Login Berhasil'
              response.ok({
                  token: token,
                },
                message,
                res
              )
              res.end()
            } else {
              var message = 'Login Gagal : Periksa password anda'
              response.unauthorized(message, res)
              res.end()
            }
          }
        }
      })
    }
  })
}

// Login Sosial
exports.signInSocial = function (req, res) {
  // Validation Input
  let validator = new validation(req.body, {
    social_id: 'required',
    provider: 'required',
    name: 'required',
    email: 'required|email',
    photoUrl: 'required',
  })

  validator.check().then(function (matched) {
    if (!matched) {
      response.error('Login Gagal', validator.errors, res)
    } else {
      // Check akun sosmed yang terhubung
      var sql = 'SELECT a.*,b.* FROM com_user a '
      sql += ' INNER JOIN com_user_social b ON a.user_id = b.user_id '
      sql += ' WHERE provider = ? AND id = ? '
      connection.query(sql, [req.body.provider, req.body.social_id], function (
        errors,
        rows,
        fields
      ) {
        if (errors) {
          var message = 'Login Gagal : Akun belum terhubung'
          response.unauthorized(message, res)
          res.end()
        } else {
          if (!rows.length) {
            var message = 'Login Gagal : Akun belum terhubung'
            response.unauthorized(message, res)
            res.end()
          } else {
            var params = {
              name: req.body.name,
              email: req.body.email,
              photoUrl: req.body.photoUrl,
            }

            var where = {
              id: req.body.social_id,
              provider: req.body.provider,
            }

            connectionAR.where(where).update('com_user_social', params, function (err) {
              if (err) {
                var message = 'Login Gagal : Data akun gagal terupdate'
                response.unauthorized(message, res)
                res.end()
              } else {
                // Login Berhasil
                var data = rows[0]
                var user_id = data.user_id
                var provider = data.provider
                const token = jwt.sign({
                    user: user_id,
                    provider: provider,
                  },
                  jwtKey, {
                    algorithm: jwtAlgorithm,
                    expiresIn: jwtExpiry,
                  }
                )

                res.cookie('token', token, {
                  maxAge: 1000 * 3600 * 24,
                })

                var message = 'Login Berhasil'
                response.ok({
                    token: token,
                  },
                  message,
                  res
                )
                res.end()
              }
            })
          }
        }
      })
    }
  })
}

// Check Auth JWT
exports.checkAuth = function (req, res) {
  const token = req.params.token

  if (!token) {
    response.unauthorized('Unauthorized', res)
    res.end()
  }
  var result
  try {
    result = jwt.verify(token, jwtKey, {
      algorithm: jwtAlgorithm,
      expiresIn: jwtExpiry,
    })

    response.ok(null, 'Verify', res)
    res.end()
  } catch (error) {
    response.unauthorized('Unauthorized', res)
    res.end()
  }
}

// Get User Login
exports.getUserLogin = function (req, res) {
  const token = req.params.token

  if (!token) {
    response.unauthorized('Unauthorized', res)
    res.end()
  }
  var jwtResult
  try {
    jwtResult = jwt.verify(token, jwtKey, {
      algorithm: jwtAlgorithm,
      expiresIn: jwtExpiry,
    })

    var sql =
      "SELECT a.user_id, IF(b.user_id IS NOT NULL, b.name, a.user_alias) AS 'name',"
    sql += " IF(b.user_id IS NOT NULL, b.email, a.user_mail) AS 'email',"
    sql +=
      " IF(b.user_id IS NOT NULL, b.photoUrl, CONCAT(a.user_img_path, a.user_img_name)) AS 'photoUrl',"
    sql += " a.user_gender AS 'gender',"
    sql += " a.user_birthday AS 'birthday',"
    sql += " a.user_no_hp AS 'no_hp'"
    sql += ' FROM com_user a'
    sql += ' LEFT JOIN com_user_social b ON a.user_id = b.user_id AND b.provider = ? '
    sql += ' WHERE a.user_id = ? '

    connection.query(sql, [jwtResult.provider, jwtResult.user], function (error, result) {
      if (error) {
        console.log(error)
        response.unauthorized('Unauthorized', res)
        res.end()
      } else {
        if (!result.length) {
          response.unauthorized('Unauthorized', res)
          res.end()
        }
        response.ok(result, 'Verify', res)
        res.end()
      }
    })
  } catch (error) {
    response.unauthorized('Unauthorized', res)
    res.end()
  }
}

// Register / SignUp
exports.signUp = function (req, res) {
  // Validation input
  let validator = new validation(req.body, {
    user_mail: 'required|email',
    password: 'required',
    confirm_password: 'required',
    user_no_hp: 'required|numeric',
    user_alias: 'required',
    user_birthday: 'required',
    user_gender: 'required',
  })

  validator.check().then(function (matched) {
    if (!matched) {
      var message = 'Registrasi Akun Gagal'
      response.error(message, validator.errors, res)
      res.end()
    } else {
      // Check exist email
      validation_duplicate({
        type: 'insert',
        params: {
          user_mail: req.body.user_mail,
          user_no_hp: req.body.user_no_hp,
        },
      }).then(function (result) {
        if (result.length > 0) {
          var message = 'Registrasi Akun Gagal'
          response.error(message, result, res)
          res.end()
        } else {
          // Gen User ID
          helper.gen_user_id().then(function (result) {
            if (result === false) {
              var message = 'Registrasi Akun Gagal : ID over limit'
              response.error(message, null, res)
              res.end()
            } else {
              // gen password
              var encrypted = encryption.encrypt(req.body.password)
              var curr_datetime = helper.curr_datetime()

              var params = {
                user_id: result,
                user_alias: req.body.user_alias,
                user_name: req.body.user_mail,
                user_mail: req.body.user_mail,
                user_pass: encrypted.encryptedData,
                user_key: encrypted.key,
                user_iv: encrypted.iv,
                user_birthday: req.body.user_birthday,
                user_no_hp: req.body.user_no_hp,
                user_gender: req.body.user_gender,
                user_st: '1',
                user_completed: '1',
                mdd: curr_datetime,
              }

              connectionAR.insert('com_user', params, function (err) {
                if (err) {
                  console.log(err)
                  var message = 'Registrasi Akun Gagal : Data user gagal disimpan'
                  response.error(message, null, res)
                  res.end()
                } else {
                  response.ok('Registrasi Berhasil', null, res)
                  res.end()
                }
              })
            }
          })
        }
      })
    }
  })
}

// Register using social media
exports.signUpSocial = function (req, res) {
  // Validation Input
  let validator = new validation(req.body, {
    social_id: 'required',
    provider: 'required',
    name: 'required',
    email: 'required|email',
    photoUrl: 'required',
  });

  validator.check().then(function (matched) {
    if (!matched) {
      response.error('Registrasi Gagal', validator.errors, res)
    } else {
      validation_social_id({
        params: {
          social_id: req.body.social_id
        }
      }).then(function (result) {
        if (result.status == false) {
          var message = 'Registrasi Gagal : Akun sudah digunakan'
          response.error(message, null, res)
          res.end()
        } else {
          validation_duplicate({
            type: 'insert',
            params: {
              user_mail: req.body.email,
            }
          }).then(function (result) {
            if (result.length > 0) {
              var message = 'Registrasi Akun Gagal'
              response.error(message, result, res)
              res.end()
            } else {
              helper.gen_user_id().then(function (result) {
                if (result === false) {
                  var message = 'Registrasi Akun Gagal : ID over limit';
                  response.error(message, null, res);
                  res.end();
                } else {
                  var curr_datetime = helper.curr_datetime();

                  var params = {
                    user_id: result,
                    user_alias: req.body.name,
                    user_mail: req.body.email,
                    user_img_path: req.body.photoUrl,
                    user_st: '1',
                    user_completed: '0',
                    mdd: curr_datetime,
                  }

                  connectionAR.insert('com_user', params, function (err) {
                    if (err) {
                      console.log(err)
                      var message = 'Registrasi Akun Gagal : Data user gagal disimpan'
                      response.error(message, null, res)
                      res.end()
                    } else {

                      var params = {
                        user_id: result,
                        id: req.body.social_id,
                        provider: req.body.provider,
                        name: req.body.name,
                        email: req.body.email,
                        photoUrl: req.body.photoUrl,
                      }
                      connectionAR.insert('com_user_social', params, function (err) {
                        if (err) {
                          console.log(err)
                          var message = 'Registrasi Akun Gagal : Data user social gagal disimpan'
                          response.error(message, null, res)
                          res.end()
                        } else {
                          response.ok('Registrasi Berhasil', null, res)
                          res.end()
                        }
                      })

                    }
                  })
                }
              });
            }
          })
        }
      })
    }
  })
}

// Connect Social
exports.connectSocial = function (req, res) {
  // Validation Input
  let validator = new validation(req.body, {
    token: 'required',
    social_id: 'required',
    provider: 'required',
    name: 'required',
    email: 'required|email',
    photoUrl: 'required',
  })

  validator.check().then(function (matched) {
    if (!matched) {
      response.error('Login Gagal', validator.errors, res)
    } else {
      // Check social_id is exist
      validation_social_id({
        params: {
          social_id: req.body.social_id
        }
      }).then(function (result) {
        if (result.status == false) {
          var message = 'Akun Gagal Dihubungkan : Akun sudah digunakan'
          response.error(message, null, res)
          res.end()
        } else {
          // Get user id by token
          helper.get_user_id_by_token(req.body.token).then(function (result) {
            if (result.status === false) {
              var message = 'Akun Gagal Dihubungkan : Token expired'
              response.error(message, null, res)
              res.end()
            } else {
              var params = {
                user_id: result.user_id,
                id: req.body.social_id,
                provider: req.body.provider,
                name: req.body.name,
                email: req.body.email,
                photoUrl: req.body.photoUrl,
              }

              connectionAR.insert('com_user_social', params, function (err) {
                if (err) {
                  var message = 'Akun Gagal Dihubungkan : Akun gagal disimpan'
                  response.error(message, null, res)
                  res.end()
                } else {
                  response.ok('Akun Berhasil Dihubungkan', null, res)
                  res.end()
                }
              })
            }
          })
        }
      })
    }
  })
}

// Internal Helper
// -- Validation Duplicate
async function validation_duplicate(req) {
  return await validationProcess(req)
}

async function validationProcess(req) {
  var validationResult = []

  // Cek Email
  if (req.params.user_mail) {
    let emails = await isExistEmail(req.type, req.params.user_mail)

    if (emails.status == true) {
      emails.status = !emails.status
      validationResult.push({
        user_email: emails,
      })
    }
  }

  // Cek Phones
  if (req.params.user_no_hp) {
    let phones = await isExistPhoneNumber(req.type, req.params.user_no_hp)

    if (phones.status == true) {
      phones.status = !phones.status
      validationResult.push({
        user_no_hp: phones,
      })
    }
  }

  return validationResult
}

async function isExistEmail(type, user_mail) {
  let rows = await findEmail(type, user_mail)

  if (!rows.length || rows[0].total == 0) {
    return {
      status: false,
      messages: '',
    }
  } else {
    return {
      status: true,
      messages: 'Email sudah terdaftar',
    }
  }
}

function findEmail(type, user_mail) {
  return new Promise(resolve => {
    if (type == 'insert') {
      var sql = "SELECT COUNT(*) AS 'total' FROM com_user WHERE user_mail = ? "
      connection.query(sql, user_mail, function (errors, rows, fields) {
        if (errors) {
          console.log('Error query : ' + errors + '. Parameter : ' + user_mail);
        } else {
          resolve(rows)
        }
      })
    } else {
      var sql =
        "SELECT COUNT(*) AS 'total' FROM com_user WHERE user_mail = ? AND user_mail <> ? "
      connection.query(sql, [user_mail, user_mail], function (errors, rows, fields) {
        if (errors) {
          console.log('Error query')
        } else {
          resolve(rows)
        }
      })
    }
  })
}

async function isExistPhoneNumber(type, user_no_hp) {
  let rows = await findPhonesNumber(type, user_no_hp)

  if (!rows.length || rows[0].total == 0) {
    return {
      status: false,
      messages: '',
    }
  } else {
    return {
      status: true,
      messages: 'No HP sudah digunakan',
    }
  }
}

function findPhonesNumber(type, user_no_hp) {
  return new Promise(resolve => {
    if (type == 'insert') {
      var sql = "SELECT COUNT(*) AS 'total' FROM com_user WHERE user_no_hp = ? "
      connection.query(sql, user_no_hp, function (errors, rows, fields) {
        if (errors) {
          console.log('Error query')
        } else {
          resolve(rows)
        }
      })
    } else {
      var sql =
        "SELECT COUNT(*) AS 'total' FROM com_user WHERE user_no_hp = ? AND user_no_hp <> ? "
      connection.query(sql, [user_no_hp, user_no_hp], function (errors, rows, fields) {
        if (errors) {
          console.log('Error query')
        } else {
          resolve(rows)
        }
      })
    }
  })
}

// -- Validation duplicate social id
async function validation_social_id(req) {
  let validation = await isExistSocialID(req.params.social_id)

  validation.status = !validation.status
  return validation
}

async function isExistSocialID(social_id) {
  let rows = await findSocialID(social_id)

  if (!rows.length || rows[0].total == 0) {
    return {
      status: false,
      messages: '',
    }
  } else {
    return {
      status: true,
      messages: 'Akun sudah terdaftar',
    }
  }
}

function findSocialID(social_id) {
  return new Promise(resolve => {
    var sql = "SELECT COUNT(*) AS 'total' FROM com_user_social WHERE id = ? "
    connection.query(sql, [social_id], function (errors, rows, fields) {
      if (errors) {
        console.log(errors)
        console.log('Query error')
      } else {
        resolve(rows)
      }
    })
  })
}

exports.index = function (req, res) {
  response.ok('Account', res)
}
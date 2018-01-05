var async = require('async'),
	bcrypt = require('bcryptjs'),
	User = require('../models/user')(),
	Session = require('../models/session')();

function _removeSensitiveInfo(data) {
	var mData = data.toObject();

	for (var item in mData) {
		if (item === 'password') {
			delete mData[item];
			break;
		}
	}

	return mData;
}

module.exports = {
	all: function(req, res) {
		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.all !== undefined) {
					req.hooks.core.users.before.all(req, res, callback);
				} else {
					callback();
				}
			},

			// get all users
			function (callback) {
				User.find(function(error, results) {
					if (!error) {
						var users = [];
						for(var i = 0; i < results.length; i++) {
							users.push({
								_id: results[i]._id,
								email: results[i].email,
								info: results[i].info
							});
						}

						callback(null, users);
					} else {
						callback(error);
					}
				});
			}
		], function (error, users) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.all !== undefined) {
					req.hooks.core.users.after.all(req, res, users);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: users
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	get: function(req, res) {
		var id = req.params.id;

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.get !== undefined) {
					req.hooks.core.users.before.get(req, res, callback);
				} else {
					callback();
				}
			},

			// get user
			function (callback) {
				User.findById(id, function(error, user) {
					if (!error) {
						if (user !== null) {
							callback(null, user);
						} else {
							callback('Unable to find.');
						}
					} else {
						callback(error);
					}
				});
			}
		], function (error, user) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.get !== undefined) {
					req.hooks.core.users.after.get(req, res, user);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: _removeSensitiveInfo(user)
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	post: function(req, res) {
		var data = req.body,
			_this = this;

		data.createdAt = new Date();
		data.updatedAt = new Date();

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.create !== undefined) {
					req.hooks.core.users.before.create(req, res, callback);
				} else {
					callback();
				}
			},

			//hash password
			function(callback) {
				bcrypt.hash(data.password, 10, function(error, hash) {
					if (!error) {
						data.password = hash;
						callback();
					} else {
						callback(error);
					}
				});
			},

			// create user
			function (callback) {
				User.create(data, function(error, user) {
					if (!error) {
						callback(null, user);
					} else {
						callback(error);
					}
				});
			},

			// send verification link to email
			function (user, callback) {
				if (!user.emailVerified) {
					var nodemailer = require('nodemailer'),
						transporter = null;

					transporter = nodemailer.createTransport({
						host: req.config.smtp.host,
						port: req.config.smtp.port,
						auth: {
							user: req.config.smtp.username,
							pass: req.config.smtp.password
						},
						secure: req.config.smtp.secure,
						tls: {
					    	rejectUnauthorized: false
					    }
					});

					transporter.verify(function(error, success) {
						if (success) {
							var text = '';

							var html =	'Welcome,' +
										'<br/><br/>' +
										'Please verify your email by clicking following link:' +
										'&nbsp;' +
										'<a href="' +
										req.protocol + '://' + req.hostname + ':' + req.config.port + '/core/users/' + user._id + '/verify"' +
										'>Email Verification</a>';

							var mailOptions = {
								from: req.config.smtp.from,
								to: user.email,
								subject: 'New Registration.',
								text: text,
								html: html
							};

							// send mail with defined transport object
							transporter.sendMail(mailOptions, function (error, info) {
								callback(error, user);
							});
						} else {
							callback(error, user);
						}
					});
				} else {
					callback(null, user);
				}
			}
		], function (error, user) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.create !== undefined) {
					req.hooks.core.users.after.create(req, res, user);
				} else {
					res.status(201).json({
						status: 201,
						success: true,
						data: _removeSensitiveInfo(user)
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	put: function(req, res) {
		var id = req.params.id,
			data = req.body;

		data.updatedAt = new Date();

		var tasks = [];

		// execute before hook if any
		tasks.push(function (callback) {
			if (req.hooks.core.users.before.update !== undefined) {
				req.hooks.core.users.before.update(req, res, callback);
			} else {
				callback();
			}
		});

		//password present so need to hash it first
		if (data.password !== undefined) {
			tasks.push(function(callback) {
				bcrypt.hash(data.password, 10, function(error, hash) {
					if (!error) {
						data.password = hash;
						callback();
					} else {
						callback(error);
					}
				});
			});
		}

		// update latest data to db
		tasks.push(function(callback) {
			User.findByIdAndUpdate(id, data, function(error, user) {
				if (!error) {
					if (user !== null) {
						//need to update manualy since mongoose return the one before update
						for (var item in data) {
							user[item] = data[item];
						}

						callback(null, user);
					} else {
						callback('Unable to find.');
					}
				} else {
					callback(error);
				}
			});
		});

		// execute tasks
		async.waterfall(tasks, function(error, user) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.update !== undefined) {
					req.hooks.core.users.after.update(req, res, user);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: _removeSensitiveInfo(user)
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	delete: function(req, res) {
		var id = req.params.id;

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.delete !== undefined) {
					req.hooks.core.users.before.delete(req, res, callback);
				} else {
					callback();
				}
			},

			// get user and remove
			function (callback) {
				User.findByIdAndRemove(id, function(error, user) {
					if (!error) {
						if (user !== null) {
							callback(null, user);
						} else {
							callback('Unable to find.');
						}
					} else {
						callback(error);
					}
				});
			}
		], function (error, user) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.delete !== undefined) {
					req.hooks.core.users.after.delete(req, res, user);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: _removeSensitiveInfo(user)
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	login: function(req, res) {
		var data = req.body,
			_this = this;

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.login !== undefined) {
					req.hooks.core.users.before.login(req, res, callback);
				} else {
					callback();
				}
			},

			//check if user email exist
			function(callback) {
				User.findOne({ email: data.email }, function(error, user) {
					if (!error) {
						if (user !== null) {
							callback(null, user);
						} else {
							callback('Invalid email and password.');
						}
					} else {
						callback(error);
					}
				});
			},

			//check given password with saved hash
			function(user, callback) {
				bcrypt.compare(data.password, user.password, function(error, result) {
					if (!error) {
						if (result) {
							callback(null, user);
						} else {
							callback('Invalid email and password.');
						}
					} else {
						callback(error);
					}
				});
			},

			//create session
			function(user, callback) {
				Session.create({ user_id: user._id }, function(error, session) {
					if (!error) {
						callback(null, user, session._id);
					} else {
						callback(error);
					}
				});
			}
		], function(error, user, sessionToken) {
			// finally
			if (!error) {
				var muser = _removeSensitiveInfo(user);
				muser.sessionToken = sessionToken;

				// execute after hook if any
				if (req.hooks.core.users.after.login !== undefined) {
					req.hooks.core.users.after.login(req, res, muser);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: muser
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	logout: function(req, res) {
		var sessionToken = req.headers['x-meijinjs-session-token'];

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.logout !== undefined) {
					req.hooks.core.users.before.logout(req, res, callback);
				} else {
					callback();
				}
			},

			//is session exist?
			function(callback) {
				if (sessionToken !== undefined) {
					Session.findById(sessionToken, function(error, session) {
						if (!error) {
							if (session !== null) {
								callback(null, session);
							} else {
								callback('Invalid session token.');
							}
						} else {
							callback(error);
						}
					});
				} else {
					callback('Invalid session token.');
				}
			},

			//remove session
			function(session, callback) {
				Session.findByIdAndRemove(session._id, function(error) {
					if (!error) {
						callback();
					} else {
						callback(error);
					}
				});
			}
		], function(error) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.logout !== undefined) {
					req.hooks.core.users.after.logout(req, res);
				} else {
					res.status(200).json({
						status: 200,
						success: true
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	verifySession: function(req, res) {
		var sessionToken = req.headers['x-meijinjs-session-token'],
			_this = this;

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.verify !== undefined) {
					req.hooks.core.users.before.verify(req, res, callback);
				} else {
					callback();
				}
			},

			//is session exist?
			function(callback) {
				if (sessionToken !== undefined) {
					Session.findById(sessionToken, function(error, session) {
						if (!error) {
							if (session !== null) {
								callback(null, session);
							} else {
								callback('Invalid session token.');
							}
						} else {
							callback(error);
						}
					});
				} else {
					callback('Invalid session token.');
				}
			},

			//find session and it's assosiate user
			function(session, callback) {
				User.findById(session.user_id, function(error, user) {
					if (!error) {
						if (user !== null) {
							callback(null, user);
						} else {
							callback('Unable to associate session with user.');
						}
					} else {
						callback(error);
					}
				});
			}
		], function(error, user) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.verify !== undefined) {
					req.hooks.core.users.after.verify(req, res, user);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: _removeSensitiveInfo(user)
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	verifyEmail: function(req, res) {
		var id = req.params.id;

		async.waterfall([
			function(callback) {
				User.findById(id, function(error, user) {
					if (!error) {
						if (user !== null) {
							callback(null, user);
						} else {
							callback('Unable to find user.');
						}
					} else {
						callback(error);
					}
				});
			},

			function(user, callback) {
				user.emailVerified = true;
				user.save(function(error) {
					callback(error);
				});
			}
		], function(error) {
			if (!error) {
				res.status(200).json({
					status: 200,
					success: true
				});
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},

	resetPassword: function(req, res) {
		var email = req.body.email,
			passGen = require('password-generator');

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.core.users.before.reset !== undefined) {
					req.hooks.core.users.before.reset(req, res, callback);
				} else {
					callback();
				}
			},

			// find user
			function(callback) {
				User.findOne({ email: email }, function(error, user) {
					if (!error) {
						if (user !== null) {
							callback(null, user);
						} else {
							callback('Invalid email.');
						}
					} else {
						callback(error);
					}
				});
			},

			// generate new password and save
			function(user, callback) {
				var newPassword = passGen(12, false);

				bcrypt.hash(newPassword, 10, function(error, hash) {
					if (!error) {
						user.password = hash;
						user.save(function(error) {
							callback(error, user, newPassword);
						});
					} else {
						callback(error);
					}
				});
			},

			// email new password to user
			function(user, newPassword, callback) {
				var nodemailer = require('nodemailer'),
					transporter = null;

				transporter = nodemailer.createTransport({
					host: req.config.smtp.host,
					port: req.config.smtp.port,
					auth: {
						user: req.config.smtp.username,
						pass: req.config.smtp.password
					},
					secure: req.config.smtp.secure,
					tls: {
				    	rejectUnauthorized: false
				    }
				});

				transporter.verify(function(error, success) {
					if (success) {
						var text =	'';

						var html =	'Password reset has been requested on ' + (new Date()) +
									'<br/><br/>' +
									'New password: ' + newPassword +
									'<br/><br/>' +
									'<i>Note: Please change to new one as soon as possible.</i>';

						var mailOptions = {
							from: req.config.smtp.from,
							to: user.email,
							subject: 'Password Reset.',
							text: text,
							html: html
						};

						// send mail with defined transport object
						transporter.sendMail(mailOptions, function (error, info) {
							callback(error);
						});
					} else {
						callback(error);
					}
				});
			}
		], function(error) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.core.users.after.reset !== undefined) {
					req.hooks.core.users.after.reset(req, res);
				} else {
					res.status(200).json({
						status: 200,
						success: true
					});
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	}
};

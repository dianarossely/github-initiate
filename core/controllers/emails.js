var async = require('async'),
	nodemailer = require('nodemailer');

module.exports = {
	send: function (req, res) {
		var smtp = req.body.smtp,
			from = req.body.from,
			to = req.body.to,
			content = req.body.content;

		var config = (smtp) ? smtp : req.config.smtp;

		if (!from) {
			from = config.from;
		}

		var transporter = nodemailer.createTransport({
			host: config.host,
			port: config.port,
			auth: {
				user: config.username,
				pass: config.password
			},
			secure: config.secure,
			tls: {
		    	rejectUnauthorized: false
		    }
		});

		async.waterfall([
			function (callback) {
				transporter.verify(callback);
			},

			function (success, callback) {
				var mailOptions = {
					from: from, 
					to: to, 
					subject: content.subject,
					text: content.text,
					html: content.html 
				};

				// send mail with defined transport object 
				transporter.sendMail(mailOptions, callback);
			}
		], function (error, info) {
			if (!error) {
				res.status(200).json({
					status: 200,
					success: true,
					data: info
				});
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
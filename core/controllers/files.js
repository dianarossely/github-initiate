var async = require('async'),
	fs = require('fs');

function _writeBase64EncodedFile(base64Encoded, filePath, callback) {
	var buffer = new Buffer(base64Encoded, 'base64');

	fs.writeFile(filePath, buffer, function(error) {
		if (!error) {
			callback();
		} else {
			callback('Failed to write file.');
		}
	});  
}

function _deleteFile(filePath, callback) {
	fs.unlink(filePath, function(error) {
		if (!error) {
			callback();
		} else {
	    	callback('Failed to delete file.');
		}
	});
}

module.exports = {
	upload: function(req, res) {
		var base64Encoded = req.body.base64Encoded,
			filename = req.body.filename,
			public = (req.body.public !== undefined) ? req.body.public : true;
		
		async.waterfall([
			function(callback) {
				if (base64Encoded !== undefined && filename !== undefined) {
					var randomStr = (new Date()).getTime() + '_' + require('password-generator')(5, true),
						filePath = '/' + randomStr + '_' + filename;
					
					_writeBase64EncodedFile(
						base64Encoded,
						((public) ? './upload/public' : './upload/private') + filePath,
						function(error) {
							if (!error) {
								callback(null, ((public) ? '/upload' : './upload/private') + filePath);
							} else {
								callback(error);
							}
						}
					);
				} else {
					callback('Insufficient data.');
				}	
			}			
		], function(error, fileUrl) {
			if (!error) {
				res.status(200).json({
					status: 200,
					success: true,
					data: (public) ? (req.protocol + '://' + req.get('Host') + fileUrl) : fileUrl
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
	
	delete: function(req, res) {
		var fileUrl = req.body.fileUrl,
			rootUrl = req.protocol + '://' + req.get('Host');
		
		async.waterfall([
			function(callback) {
				if (fileUrl !== undefined) {
					var filePath = fileUrl;
					
					if (filePath.indexOf(rootUrl) === 0) {
						filePath = filePath.substr(rootUrl.length, filePath.length - rootUrl.length);
					}
					
					if (filePath.indexOf('./upload/private') !== 0) {
						filePath = './upload/public' + filePath.substr(filePath.lastIndexOf('/'));
					}
					
					_deleteFile(filePath, callback);
				} else {
					callback('Insufficient data.');
				}
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
	}
};
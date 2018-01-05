var mongoose = require('mongoose');

module.exports = function(name, schema) {
	return mongoose.model(name, schema);
};
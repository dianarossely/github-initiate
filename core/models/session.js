var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var sessionSchema = new Schema({
	user_id: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, expires: '7d' },
	updatedAt: { type: Date, default: Date.now }
});

module.exports = function() {
	return mongoose.model('session', sessionSchema);	
};
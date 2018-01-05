var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var userSchema = new Schema({
	email:
	{
		type: String,
		required: true,
		unique: true
	},
	password:
	{
		type: String,
		required: true
	},
	emailVerified:
	{
		type: Boolean,
		default: false
	},
	info: Schema.Types.Mixed,
	createdAt:
	{
		type: Date,
		default: Date.now
	},
	updatedAt:
	{ type: Date,
		default: Date.now
	}
});

module.exports = function()
{
	return mongoose.model('user', userSchema);
};

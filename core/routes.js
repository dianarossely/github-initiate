var express = require('express'),
	router = express.Router();

//routes
//users routes
var usersCtr = require('./controllers/users');

router.use('/users', function(req, res, next) {
  if (req.db !== null) {
  	next();
  } else {
  	res.status(404).json({
		status: 404,
		success: false,
		error: 'Database has been disabled.'
	});
  }
});

router
	.route('/users')
	.get(usersCtr.all)
	.post(usersCtr.post);

router
	.route('/users/me')
	.get(usersCtr.verifySession);
	
router
	.route('/users/login')
	.post(usersCtr.login);
	
router
	.route('/users/logout')
	.delete(usersCtr.logout);
	
router
	.route('/users/reset')
	.put(usersCtr.resetPassword);
	
router
	.route('/users/:id')
	.get(usersCtr.get)
	.put(usersCtr.put)
	.delete(usersCtr.delete);
	
router
	.route('/users/:id/verify')
	.get(usersCtr.verifyEmail);

//end users routes

//collections routes
var collectionsCtr = require('./controllers/collections');

router.use('/collections', function(req, res, next) {
  if (req.db !== null) {
  	next();
  } else {
  	res.status(404).json({
		status: 404,
		success: false,
		error: 'Database has been disabled.'
	});
  }
});

//param middleware function that check if collection requested exist in configuration
var validateCollectionName = function(req, res, next) {
	if (collectionsCtr.isExist(req, res, req.params.name)) {
		if (req.query._params === undefined) {
			req.query._params = {};
		} else {
			req.query._params = JSON.parse(req.query._params);
		}
		
		next();
	} else {
		res.status(404).json({
			status: 404,
			success: false,
			error: 'Invalid collection.'
		});
	}
};

router.param('name', validateCollectionName);

router
	.route('/collections')
	.get(collectionsCtr.index);
	
router
	.route('/collections/:name')
	.get(collectionsCtr.all)
	.post(collectionsCtr.post);

router
	.route('/collections/:name/:id')
	.get(collectionsCtr.get)
	.put(collectionsCtr.put)
	.delete(collectionsCtr.delete);
	
//end collections routes

//files routes
var filesCtr = require('./controllers/files');

router
	.route('/files')
	.post(filesCtr.upload)
	.delete(filesCtr.delete);
	
//end files routes

//emails routes
var emailCtr = require('./controllers/emails');
router.route('/emails').post(emailCtr.send);
//end of emails routes
//end routes

module.exports = router;
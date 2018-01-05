var cluster = require('cluster');
var path = require('path');
var expressValidator = require('express-validator');
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var express = require('express')
var mongoose = require('mongoose');
var _ = require('underscore');
var async = require('async');
var moment = require('moment');

var _coreRouter = require('./core/routes.js');
var _router = express.Router();
var _env = 'default';
var _config = {
	default: JSON.parse(
				JSON.stringify(
					require('./config/default')))
};
var _collections = {};
var _hooks = {
	collections: {
		before: {
			all: {},
			get: {},
			post: {},
			put: {},
			delete: {}
		},
		after: {
			all: {},
			get: {},
			post: {},
			put: {},
			delete: {}
		}
	},
	core: {
		users: {
			before: {
				all: undefined,
				create: undefined,
				delete: undefined,
				get: undefined,
				login: undefined,
				logout: undefined,
				reset: undefined,
				update: undefined,
				verify: undefined
			},
			after: {
				all: undefined,
				create: undefined,
				delete: undefined,
				get: undefined,
				login: undefined,
				logout: undefined,
				reset: undefined,
				update: undefined,
				verify: undefined
			}
		}
	}
};

function _requireDirectoriesHelper(callback)
{
	console.log('Checking all require directories...');

	var fs = require('fs');

	async.waterfall([
		function (callback) {
			fs.mkdir('./public', function (error)
			{
				if (error)
				{
					console.log('FOLDER ./public ...EXIST');
				} else
				{
					console.log('FOLDER ./public ...CREATED');
				}

				callback();
			});
		},

		function (callback)
		{
			fs.mkdir('./upload', function (error)
			{
				if (error)
				{
					console.log('FOLDER ./upload ...EXIST');
				} else
				{
					console.log('FOLDER ./upload ...CREATED');
				}

				callback();
			});
		},

		function (callback)
		{
			fs.mkdir('./upload/public', function (error)
			{
				if (error)
				{
					console.log('FOLDER ./upload/public ...EXIST');
				} else
				{
					console.log('FOLDER ./upload/public ...CREATED');
				}

				callback();
			});
		},

		function (callback)
		{
			fs.mkdir('./upload/private', function (error)
			{
				if (error)
				{
					console.log('FOLDER ./upload/private ...EXIST');
				} else
				{
					console.log('FOLDER ./upload/private ...CREATED');
				}

				callback();
			});
		},

		function (callback)
		{
			fs.mkdir('./views', function (error)
			{
				if (error)
				{
					console.log('FOLDER ./views ...EXIST');
				} else
				{
					console.log('FOLDER ./views ...CREATED');
				}

				callback();
			});
		}
	], function (error)
	{
		if (callback) {
			callback(error);
		} else
		{
			if (error)
			{
				console.error(error);
			} else
			{
				console.log('DONE checking require directories.');
			}
		}
	});
}

module.exports = {
	environment: function (value)
	{
		if (value)
		{
			_env = value;
		} else
		{
			return _env;
		}
	},

	config: function (obj, env)
	{
		if (obj)
		{
			env = env || 'default';
			if (_config[env]) {
				_config[env] = _.extend(_config[env], obj);
			} else
			{
				var defaultConfig = JSON.parse(
										JSON.stringify(
											require('./config/default')));

				_config[env] =	_.extend(defaultConfig, obj);
			}
		} else
		{
			return _config[_env];
		}
	},

	core: {
		hook: function (when, type, collectionName, func)
		{
			_hooks.core[collectionName][when][type] = func;

			/** func example
			//when === 'before'
			function (req, res, next) {
				//TODO custom logic
				next();
			}

			//when === 'after'
			function (req, res, data) {
				//TODO custom logic
				//TODO custom response
			}
			**/
		}
	},

	collections: {
		add: function (name, collection)
		{
			var isReserveConflict = false;

			switch (name) {
				case 'user':
				case 'users':
				case 'session':
				case 'sessions':
					isReserveConflict = true;
					break;
				default:
					isReserveConflict = false;
			}

			if (!isReserveConflict)
			{
				_collections[name] = new mongoose.Schema(collection);
				_collections[name].add({
					createdAt: { type: Date, default: Date.now },
					updatedAt: { type: Date, default: Date.now }
				});
			} else
			{
				console.error('ERROR: Custom collection name conflict with core. Please use different name, ' + name);
			}
		},

		hook: function (when, type, collectionName, func)
		{
			_hooks.collections[when][type][collectionName] = func;

			/** func example
			//when === 'before'
			function (req, res, next) {
				//TODO custom logic
				next();
			}

			//when === 'after'
			function (req, res, data) {
				//TODO custom logic
				//TODO custom response
			}
			**/
		}
	},

	router: _router,

	listen: function () {
		if (cluster.isMaster)
		{
			console.log('Starting MeijinJS...');
			console.log('');

			var startMsg = 'Meijin, literally translated, means "Brilliant Man". ' +
						'It is the name of the second most prestigious Japanese Go Tournament. ' +
						'It also refers to a traditional Japanese title given to the strongest ' +
						'player of the day during the Edo period.';

			console.log(startMsg);

			// Check whether environment config has been define. Fallback if not.
			if (!_config[_env])
			{
				_env = 'default';
			}

			// Count the machine's CPUs
		    var maxCpuCount = require('os').cpus().length,
		    	totalWorker = _config[_env].cpu;

		    if (totalWorker > maxCpuCount)
				{
		    	totalWorker = maxCpuCount;
		    }

		    // Listen for dying workers
			cluster.on('exit', function (worker)
			{
			    // Replace the dead worker,
			    // we're not sentimental
			    console.log('Worker %d died :', worker.id);
			    cluster.fork();
			});

		    // Create a worker for each CPU
		    for (var i = 0; i < totalWorker; i++)
				{
		        cluster.fork();
		    }
		} else
		{
			var bodyParser = require('body-parser'),
				handlebars = require('hbs'),
				app = express();

			//initialize database connection
			var str = require('string'),
				db = require('mongoose'),
				dbConStr = '',
				dbConStrTemplate = 'mongodb://{{auth}}{{host}}:{{port}}/{{database}}',
				templateVal = {
					auth: ((_config[_env].database.username.length > 0) ? (_config[_env].database.username + ':' + _config[_env].database.password + '@') : ''),
					host: _config[_env].database.host,
					port: _config[_env].database.port,
					database: _config[_env].database.name
				};

			dbConStr = str(dbConStrTemplate).template(templateVal).s;

			if (_config[_env].database.enable)
			{
				db.connect(dbConStr);
			} else
			{
				db = null;
			}

			console.log('');
			_requireDirectoriesHelper(function (error)
			{
				//express middleware & configuration
				console.log('');
				console.log('SET server request limit:', _config[_env].requestSizeLimit);
				console.log('SET server parameter limit:', _config[_env].requestParameterLimit);

				app.use(bodyParser.json({
					limit: _config[_env].requestSizeLimit,
					parameterLimit: _config[_env].requestParameterLimit
				}));
				app.use(bodyParser.urlencoded({
					extended: true,
					limit: _config[_env].requestSizeLimit,
					parameterLimit: _config[_env].requestParameterLimit
				}));

				app.use('/', express.static('./public'));
				app.use('/upload', express.static('./upload/public'));

				app.set('views', './views');
				app.set('view engine', 'html');
				app.engine('html', handlebars.__express);

				app.use(function(req, res, next)
				{
					//pass environment value
					req.env = _env;

					//make config available to all router
					req.config = _config[_env];

					//make db available to all router
					req.db = db;

					//make all request hooks available to all router
					req.hooks = _hooks;

					//pass collections
					req.collections = _collections;

					//log request
					if (req.config.log.requestUrl || req.config.log.requestBody)
					{
						console.log('');
						if (req.config.log.requestUrl)
						{
							console.log(moment().format('YYYY-MM-DD HH:mm:ss'), req.method, req.originalUrl);
						}

						if (req.config.log.requestBody)
						{
							console.log(JSON.stringify(req.body));
						}
					}

					//enable CORS base on config
					if (req.config.cors.enable)
					{
						var originWhitelist = '*';

						if (req.config.cors.origins.length > 0)
						{
							originWhitelist = '';

							for (var i = 0; i < req.config.cors.origins.length; i++)
							{
								if (originWhitelist.length > 0)
								{
									originWhitelist = originWhitelist + ', ';
								}

								originWhitelist = originWhitelist + req.config.cors.origins[i]
							}
						}

						if (req.config.cors.methods.length > 0)
						{
							var methodWhitelist = '';

							for (var i = 0; i < req.config.cors.methods.length; i++)
							{
								if (methodWhitelist.length > 0)
								{
									methodWhitelist = methodWhitelist + ', ';
								}

								methodWhitelist = methodWhitelist + req.config.cors.methods[i]
							}

							res.header('Access-Control-Allow-Methods', methodWhitelist);
						}

						res.header('Access-Control-Allow-Origin', originWhitelist);
						res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Meijinjs-Api-Key, X-Meijinjs-Session-Token');
					}

					//check header for api key and compare it with config value if enable
					if (req.config.apiKey.enable
							&& req.config.apiKey.exception.hostnames.indexOf(req.hostname) === -1
							&& req.config.apiKey.exception.urls.indexOf(req.path) === -1
							&& req.config.apiKey.methods.indexOf(req.method) !== -1) {
						var apiKeyValue = req.headers['x-meijinjs-api-key'];

						if (apiKeyValue === req.config.apiKey.value)
						{
							if (req.config.log.requestUrl || req.config.log.requestBody)
							{
								console.log('ACCEPTED');
							}

							next();
						} else
						{
							if (req.config.log.requestUrl || req.config.log.requestBody)
							{
								console.log('REJECTED');
							}

							res.status(401).json({
								status: 401,
								success: false,
								error: "Unauthorized."
							});
						}
					} else
					{
						if (req.config.log.requestUrl || req.config.log.requestBody)
						{
							console.log('ACCEPTED');
						}

						next();
					}
				});

				app.use('/core', _coreRouter);
				app.use('/', _router);

				//listen
				app.listen(_config[_env].port, function()
				{
					console.log('');
					console.log('APPLICATION STARTED. Worker #' + cluster.worker.id + ' listening to port ' + _config[_env].port + '...');
				});
			});
		}
	}
};

var meijin = require('./index');
/*
var header =
{
  'Content-Type': 'application/json'
};*/

meijin.config({
	database:
	{
		enable: false,
		host: "192.168.99.100",
		port: 27017,
		name: "meijinjs",
		username: "",
		password: ""
	},

	apiKey:
	{
		"enable": true,
		"value": "test",
		"methods": ["GET", "POST", "PUT", "DELETE"],
		"exception":
		{
			"hostnames": ["127.0.0.1"],
			"urls": [
				"/test/url/exceptions"
			]
		}
	}
});

meijin.collections.add('ones', {
	attr1:
	{
		type: String,
		default: 'attr1'
	},
	attr2:
	{
		type: String,
		default: 'attr2'
	}
});

meijin.collections.hook('before', 'all', 'ones', function (req, res, next)
{
	console.log('collection ones before all hook...');
	next();
});

meijin.collections.hook('after', 'all', 'ones', function (req, res, data)
{
	console.log('collection ones after all hook...');
	res.status(200).json({
		status: 200,
		success: true,
		hook: true,
		data: data
	})
});

meijin.core.hook('before', 'all', 'users', function (req, res, next)
{
	console.log('core users before all hook...');
	next();
});

meijin.core.hook('after', 'all', 'users', function (req, res, data)
{
	console.log('core users after all hook...');
	res.status(200).json({
		status: 200,
		success: true,
		hook: true,
		data: data
	})
});

meijin.router.get('/', function (req, res)
{
	res.send('Hello World!!!');
});

meijin.router.get('/test/url/exceptions', function (req, res)
{
	res.send('Authorized');
});

meijin.listen();

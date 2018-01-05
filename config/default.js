module.exports = {
	// No of cluster worker
	"cpu": 1,
	// Port this app will be expose to.
	"port": 3000,
	// limit size per request
	"requestSizeLimit": "10mb",
	// limit parameter per request
	"requestParameterLimit": 10000,
	// mongodb database configuration.
	"database": {
		"enable": true,
		"host": "192.168.99.100",
		"port": 27017,
		//"name": "meijinjs",
		"name": "twentyeight_payment",
		"username": "",
		"password": ""
	},
	// Email smtp relay configuration for mailing task.
/*	"smtp": {
		"host": "smtp.mail.com",
		"port": 465,
		"secure": false,
		"username": "user@email.com",
		"password": "password",
		"from": "System Admin <user@email.com>"
	},*/
	"smtp": {
          "host": "smtp.gmail.com",
          "port": 465,
          "secure": true,
          "username":"wndianarosli@gmail.com",
          "password": "",
          "from": "Hello <wndianarosli@gmail.com>"
        },
	// CORS enable/disable. Leave origins empty if enable cors for all sites.
	// methods need to be define.
	"cors": {
		"enable": true,
		"origins": [],
		"methods": [ "GET", "POST", "PUT", "DELETE" ]
	},
	// If enable app will also check for the api keys in request header (x-meijinjs-api-key).
	"apiKey": {
		//"enable": false,
		"enable": true,
		"value": "m31j1njs",
		//"methods": ["POST", "PUT", "DELETE"],
		"methods": ["GET", "POST", "PUT", "DELETE"],
		"exception": {
			"hostnames": ["127.0.0.1"],
			//"urls": []
			"urls": [
				"/test/url/exceptions"
			]
		}
	},
	"log": {
		"requestUrl": true,
		"requestBody": false
	}
};

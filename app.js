const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const expressValidator = require('express-validator');
const passport = require('passport');
const config = require('./config/database');

var header = {'Content-Type': 'application/json'};

mongoose.connect(config.database);

//mongoose.connect('mongodb://root:t3chn3rdL4B;@jomhalal.my:22/try2');

let db = mongoose.connection;

// Check connection
db.once('open', function()
{
  console.log('Connected to MongoDB');
});

// Check for DB errors
db.on('error', function(err)
{
  console.log(err);
});

/*meijin.config(
  {
    port: 3000,
    database:
      {
        enable: true,
        host: "localhost",
        port: 27017,
        name: "meijinjs",
        u,sername: "",
        password: ""
      },

      "smtp":
        {
          "host": "smtp.gmail.com",
          "port": 465,
          "secure": true,
          "u,sername":"wndianarosli@gmail.com",
          "password": "Mabuko93",
          "from": "Hello <wndianarosli@gmail.com>"
        }
});*/
// Init App
const app = express();

// Bring in Models
let Article = require('./core/models/article');

// Load View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Body Parser Middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// Set Public Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session Middleware
app.use(session(
{
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));

// Express Messages Middleware
app.use(require('connect-flash')());
app.use(function (req, res, next)
{
  res.locals.messages = require('express-messages')(req, res);
  next();
});

// Express Validator Middleware
app.use(expressValidator({
  errorFormatter: function(param, msg, value)
  {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length)
    {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg : msg,
      value : value
    };
  }
}));

// Passport Config
require('./config/passport')(passport);
// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next)
{
  res.locals.user = req.user || null;
  next();
});

// Home Route
app.get('/', function(req, res)
{
  Article.find({}, function(err, articles)
  {
    if(err)
    {
      console.log(err);
    } else
    {
      res.render('indexx',
       {
        title:'Halal Requests',
        articles: articles
       });
    }
  });
});

// Route Files
let articles = require('./core/controllers/articles');
let userz = require('./core/controllers/userz');
app.use('/articles', articles);
app.use('/userz', userz);

// Start Server
app.listen();

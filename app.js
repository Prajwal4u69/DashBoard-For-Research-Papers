var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var hbs = require('express-handlebars');
var engines = require('consolidate');
var cors = require('cors')// for enabling cores in app

var routes = require('./routes/index');

var app = express();
app.use(cors())

// view engine setup
app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/'}));
app.engine('html', engines.ejs);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');



// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});



app.get('/', function(req, res, next) {
  gfs.files.findOne({filename: req.params.filename}, (err, file) => {
  //  check if file
    if(!file || file.length === 0){
    res.render('index', { files: false });
   }else {
      file.map(file => {
         if(file.contentType === 'image/jpeg' || file.contentType =='image/png')
       {
          file.isImage = true;
     } else {
         file.isImage =false;
       }
      });
    res.render('index', { files: false });

   }
  });

});





// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});



app.listen(9999,function(){
  console.log("started on 9999")
});

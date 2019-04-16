var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
mongoose.connect('localhost:27017/papers');
var Schema = mongoose.Schema;
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');
const bodyParser =require('body-parser');


var userDataSchema = new Schema({
  Name: {type: String, required: true},
  PaperName: String,
  JournalName: String,
  Password: String,
  filename   : { type: String, required: true },
  created: {
        type: Date,
        default: Date.now
    },
}, {collection: 'user-data'});



var UserData = mongoose.model('UserData', userDataSchema);
const mongoURI ='mongodb://localhost:27017/papers';
const conn = mongoose.createConnection(mongoURI);
const dbName = "papers";


let gfs;

conn.once('open',()=>{
   gfs= Grid(conn.db,mongoose.mongo);
   gfs.collection('user-data');
})


// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'user-data'
        };
        resolve(fileInfo);
      });
    });
  }
});

const insert = multer({ storage });

/* GET home page. */


router.get('/index', function(req, res, next) {
  res.render('index');
});

router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/insert',function(req, res, next) {
  res.render('insert');
});




router.get('/load', function(req, res, next) {
//find al; docs and display them to page
  UserData.find()
      .then(function(doc) {
        console.log("ALL DOCS PRESENT IN DB",doc)
        res.render('load', {items: doc});
      }).catch(err=>{
        console.log("ERROR PRESENT IN THE REQUESTING FILES FROM SERVER")
      });
});

//for searching purpose
router.post('/searched', function(req,res,next) {

  console.log("BODY OBJECT : ",req.body);
  let searchedString = req.body.search;
  console.log("searched String ", searchedString);
  UserData.find()
  .then(function(doc) {
    console.log("ALL DOCS PRESENT IN DB",doc)
    let allDocContainingSS = doc.filter(d => d.Name.toString().includes(searchedString));
    console.log("DOCUMENTS WE FOUND WITH MATCHED STRING :",allDocContainingSS);
    res.json({items: allDocContainingSS});
  }).catch(err=>{
    console.log("ERROR PRESENT IN THE REQUESTING FILES FROM SERVER")
  });
});


router.get('/display/:filename', (req, res) => {
gfs.files.findOne({filename: req.params.filename }, (err, file) => {
          //check if file
          if(!file || file.length === 0){
            return res.status(404).json({
              err: 'NO file exists'
            });
          }
          // check if image

        if(file.contentType === 'image/jpeg' || file.contentType === 'img/png'){
          // read output to browser
          const readstream = gfs.createReadStream(file.filename);
          readstream.pipe(res);
        }else {
          {
            res.status(404).json({
              err: 'Not an image'
            });
          }
        }
      });

    });

router.post('/insert',insert.single('filename'),async (req, res)=> {

console.log("-->>",req.body);
  var item = {
    Name: req.body.Name,
    PaperName: req.body.PaperName,
    JournalName: req.body.JournalName,
    Password: req.body.Password,
    created: req.body.created,
    filename:   req.file.filename,
};

  var data = new UserData(item);
  console.log(data);
  data.save();
//  res.json({ file: req.file });

  res.redirect('/insert');
});



// delete the file and and pdf related to the file
router.post('/delete', function(req, res, next) {

  const newStr = JSON.stringify(req.body);
  const ultraStr = newStr.split("\"");
  const novaStr = ultraStr[1];
  const gameChanger = novaStr.split(" "); // lol

      console.log("--->",gameChanger);

  UserData.findByIdAndRemove(gameChanger[1]).exec();



  gfs.remove({filename:gameChanger[0], root: 'user-data'} , function(err){
   if (err){
  console.log("error");
}else{
console.log("old file removed")
}
});

  res.redirect('/load');
});


// @route GET /
// @desc Loads form
router.get('/load', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    // Check if files
    if (!files || files.length === 0) {
      res.render('load', { files: false });
    } else {
      files.map(file => {
        if (
          file.contentType === 'image/jpeg' ||
          file.contentType === 'image/png'
        ) {
          file.isImage = true;
        } else {
          file.isImage = false;
        }
      });
      res.render('load', { files: files });
    }
  });
});

// to display the pdf file

router.post('/displaypdf1', insert.single('filename'), function(req, res, next)  {


  const newStr = JSON.stringify(req.body);
  const ultraStr = newStr.split("\""); // lol

console.log("asdsadsd--->",ultraStr);

  gfs.files.findOne({ filename: ultraStr[1] }, (err, file) => {
    // Check if file exist in the mongo or not
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exists'
      });
    }
    // If File exists this will get executed
    const readstream = gfs.createReadStream(file.filename);
    return readstream.pipe(res);
  });
});
// download the pdf file using grid fs

router.post('/downloadpdf1',insert.single('filename'), function(req, res){

// console.log("req.body.filename    %j ",req.body);

const newStr = JSON.stringify(req.body);
const ultraStr = newStr.split("\""); // lol

console.log("req.body.filename  ",ultraStr[1]);



gfs.findOne({ filename: ultraStr[1], root: 'user-data' }, function (err, file) {
    if (err) {
        return res.status(400).send(err);
    }
    else if (!file) {
        return res.status(404).send('Error on the database looking for the file.');
    }

    res.set('Content-Type', file.contentType);
    res.set('Content-Disposition', 'attachment; filename="' + file.filename + '"');

    var readstream = gfs.createReadStream({
      filename: ultraStr[1],
      root: 'user-data'
    });

    readstream.on("error", function(err) {
        res.end();
    });
    readstream.pipe(res);
  });

    });

    // display fileand its type to json format
    router.get('/json', (req, res) => {
      gfs.files.find().toArray((err, files) => {
        // Check if files
        if (!files || files.length === 0) {
          return res.status(404).json({
            err: 'No files exist'
          });
        }
        // Files exist
        return res.json(files);
      });
    });


router.get('/stylesheet/font-awesome.min.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/simple-line-icons.min.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/bootstrap.min.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/uniform.default.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/jqvmap.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/morris.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/tasks.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/components-md.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/plugins-md.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/layout.css', function(req, res){ res.send('css/styles.css'); res.end(); });
router.get('/stylesheet/custom.css', function(req, res){ res.send('css/styles.css'); res.end(); });




module.exports = router;

const PORT = 8000;
const express = require('express');
const session = require('express-session');
const url = require('url');
const http = require('http');
const hash = require('object-hash');
const fs = require('fs');
const { parse } = require('querystring');
const app = express();
const Db = require('mongodb');
const MongoClient = Db.MongoClient;
const Server = require('mongodb').Server;
const DBurl = "mongodb://localhost:27017/new";

/*
Start connection to Database
*/
//for first time set up. should find a better way to do this tbh

function search(nameKey, myArray){
  for (var i=0; i < myArray.length; i++) {
      if (myArray[i].name === nameKey) {
          return myArray[i];
      }
  }
  return (-1);
}
function searchPair(nameKey1, nameKey2, myArray){
  for (var i=0; i < myArray.length; i++) {
      if (myArray[i].name === nameKey1 && myArray[i].passwd === nameKey2) {
          return myArray[i];
      }
  }
  return (-1);
}

MongoClient.connect(DBurl, {useNewUrlParser:true}, function(err, client){
  if (err){
    console.log("Could not Connect");
  }
  var db = client.db("new")
  db.listCollections().toArray(function(err, collInfos){
    if (search("users", collInfos) != -1){
        console.log("Found Users");
      }
    else{
      db.createCollection("users", function(err){
        db.collection("users").insertOne({ _id:999, name: "Admin", passwd: "Admin", acc: "god" });
        console.log("created Admin Account: to access use DEFAULT user and pass");
      });
       console.log("Creating Collection : Users");
      }
      if (search("products", collInfos) != -1){
        console.log("Found Products");
      }
      else{
        db.createCollection("products");
        console.log("Creating Collection : Products");
      }
      if (search("cart", collInfos) != -1){
        console.log("Found Cart");
      }
      else{
        db.createCollection("cart");
        console.log("Creating Collection : Cart");
      }
     });
     var rand = Math.floor((Math.random() * 100000000) + 1);
app.use(session({secret: 'test' + rand}));

var sess;

var DIR =  __dirname + "/database";
var USER_file = DIR + "/user" //or users or stock
var CATEGORY = DIR +"/category"

/*
GET REQUEST
*/

app.get ('/shop', function(req,res){
  fs.readFile('./shop.html', function (error, html) {
    if (error) {
      res.writeHead(404);
      res.write('404 ERROR: Contents you are looking are Not Found');
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(html);
      res.end();
    }
  });
});

app.get ('/account', function(req,res){
  //login page
  fs.readFile('./login.html', function (error, html) {
    if (error) {
      res.writeHead(404);
      res.write('404 ERROR: Contents you are looking are Not Found');
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(html);
      res.end();
    }
  });
});

app.get ('/basket', function(req,res){
  res.end("basket")
});

app.get('*', function(req,res){
  sess = req.session;

  fs.readFile('./home.html', function (error, html) {
    if (error) {
      res.writeHead(404);
      res.write('404 ERROR: Contents you are looking are Not Found');
      res.end();
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.write(html);
      res.end();
    }
  });
});

/*
POST REQUEST
*/

app.post('/create', function(req,res){
  sess = req.session;
  sess.cookie.maxAge = 108000 // to verify

  if (req.method === 'POST') {
    collectRequestData(req, result => {
      var login = result.login;
      var passwd = hash(result.passwd, { algorithm: 'md5', encoding: 'base64' });
      var user = [];
      user['login'] = login;
      user['passwd'] = passwd;
      var b = 0;
      var filter = db.collection("users");
      filter.find({name: user['login']}).toArray(function(err, array) {
        if (array.length > 1){
          console.log("Already")
          b = 1;
        }
        if (b == 0)
        {
          db.collection("users").insertOne({name: user['login'], passwd: user['passwd']});
          console.log('New user in');
          sess.logged_on_user = login;
        }
          if (b == 1){
            res.end("username alerady used. Please use another one!");
          }
          else
          {
            res.end("ok, well done " + sess.logged_on_user + " !");
          }
      })
    })
  }
});

  app.post('/login', function(req,res){
    sess = req.session;
    sess.cookie.maxAge = 108000 // to verify

    if (req.method === 'POST') {
      collectRequestData(req, result => {
        var login = result.login;
        var passwd = hash(result.passwd, { algorithm: 'md5', encoding: 'base64' });
        var user = [];
        user['name'] = login;
        user['passwd'] = passwd;
        var b = 0;
        var filter = db.collection("users");
        filter.find({name: user['name']}).toArray(function(err, array) {
          array.forEach(function(element){
            if (element.toString().search(user['passwd'].toString()) == -1){
              if (element.name === user['name'] && element.passwd === user['passwd'])
              {
                console.log('Success');
                sess.logged_on_user = login;
              }
              else
              {
                console.log('Failure')
                b = 1;
              }
            }
            else
            {
              console.log('New user in');
              sess.logged_on_user = login;
              b = 2;
            }
          });
          if (b == 1 || array.length == 0){
            res.end("Wrong info");
          }
          else{
            res.end("ok, well done " + sess.logged_on_user + " !");
          } 
          })
          })
        }
      });

    app.post('/logout', function(req,res){
      sess = req.session;

      if (req.method === 'POST') {
        collectRequestData(req, result => {

          if (!(sess.logged_on_user === undefined))
          {
            res.end("You sucessfully logged out," + sess.logged_on_user + "!")
            req.session.destroy();
          }
          else {
            res.end("You are not logged in!")
          }
        });
      }
    });

    app.post('/admin', function(req,res){
      sess = req.session;
      sess.cookie.maxAge = 108000 // to verify

      if (req.method === 'POST') {
        collectRequestData(req, result => {
          var admin = [];
          admin['login'] = result.login;
          admin['passwd'] = result.passwd;
// this is a backdoor, { can be changed at a later time }
          if (admin['login'] === "admin" && admin['passwd'] === "admin")
          {
            fs.readFile('./admin.html', function (error, html) {
              if (error) {
                res.writeHead(404);
                res.write('404 ERROR: Contents you are looking are Not Found');
                res.end();
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(html);
                res.end();
              }
            });
          }
          else {
            res.end("Wrong Credentials!");
          }
        });
      }
    });

    app.post('/admin_modify_user', function(req,res){
      if (req.method === 'POST') {
        collectRequestData(req, result => {
          var new_passwd = hash(result.new_passwd, { algorithm: 'md5', encoding: 'base64' });
          var login = result.login;
          
          var filter = db.collection("users");
          filter.find({name: login}).toArray(function(err, array) {
            array.forEach(function(element){
                if (element.name === login)
                {
                  console.log("valid user");
                  element.passwd = new_passwd;
                  res.end("Password modified!");
                }
                else
                {
                  res.end("No User!");
                  console.log("No User");
                }
          })
          if (array.length == 0)
          {
            res.end("No User!");
            console.log("No User");
          }
            })
          });
        };
        });

      app.post('/admin_erase_user', function(req,res){
        if (req.method === 'POST') {
          collectRequestData(req, result => {
            var login = result.login;
        var nah = 0;
        var filter = db.collection("users");
        filter.find({name: login}).forEach(function(err, item) {
          if (item){
            console.log("valid user");
            filter.findOneAndDelete({name: login}, {remove:true});
            res.end("Deleted!");
            nah = 1;
          }
        })
        if (nah == 0)
        {
          console.log("Invalid user");
          res.end("No User!");
        }
      })
}
      });


        app.post('/admin_create_category', function(req,res){
          if (req.method === 'POST') {
            collectRequestData(req, result => {
              var category = result.category;

              if(fs.existsSync(CATEGORY)) {
                fs.readFile(CATEGORY, 'utf8', function readFileCallback(err, data){
                  if (err){
                    console.log(err);
                  } else {
                    var b = 0;
                    var obj = JSON.parse(data); //now it's an object

                    obj.existing.forEach(function(elem){
                      if (elem['login'] == user['login'])
                      {
                        console.log("Already")
                        b = 1;
                      }
                    });

                    if (b == 1)
                    res.end("Username already used. Please use another one!");
                    else
                    {
                      obj.existing.push({login: user['login'], passwd: user['passwd']});
                      var json = JSON.stringify(obj); //convert it back to json
                      fs.writeFile(USER_file, json, 'utf8', function(){
                        console.log('New user in!')
                      }); // write it back
                      sess.logged_on_user = login;
                      res.end("Ok, well done " + result.login + " !");
                    }
                  }});
                }
                else {
                  if (!fs.existsSync(DIR)){
                    fs.mkdirSync(DIR);
                  }
                  fs.closeSync(fs.openSync(CATEGORY, 'w'))

                  new1 = []
                  var obj = {
                  }

                  obj += new1;

                  obj.new1.push({test: 'test'});
                  var json = JSON.stringify(obj);
                  fs.writeFile(CATEGORY, json, 'utf8', function() {
                    console.log('First category created!')
                  });
                  res.end("Category created!");
                }
              });
            }
          });

        /*
        LISTEN ON PORT
        */

        app.listen(PORT, function(){
          console.log("App Started on PORT " + PORT);
        });

        /*
        THIRD FUNCTIONS
        */

        function collectRequestData(request, callback) {
          const FORM_URLENCODED = 'application/x-www-form-urlencoded';
          if(request.headers['content-type'] === FORM_URLENCODED) {
            let body = '';
            request.on('data', chunk => {
              body += chunk.toString();
            });
            request.on('end', () => {
              callback(parse(body));
            });
          }
          else {
            callback(null);
          }
        }
      });
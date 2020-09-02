require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const MongoClient = require('mongodb').MongoClient;
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const bcrypt = require('bcrypt');
const saltRounds = 10;
const path = require('path');
const jwt = require('jsonwebtoken');
const e = require('express');
const cookieParser = require('cookie-parser');

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('html'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const PERMS = {   // Permissions for users
  ADMIN: "ADMIN",
  CONTRIBUTOR: "CONTRIBUTOR",
  VIEWER: "VIEWER"
};

client.connect(err => {
  const collectionUsers = client.db('users').collection('users');
  const collectionQuizzes = client.db('quizzes').collection('quizzes');

  // Configure database with 'known_users.json'
  var known_users = require('./known_users.json');
  known_users.forEach(user => {
    collectionUsers.findOne({login: user.login}, (err, result) => {
      if (!err) {
        if (!result) {
          bcrypt.hash(user.password, saltRounds, (err, hash) => {
            if (!err) {
              user.password = hash
              collectionUsers.insertOne(user, (err, result) => { if (err) console.log('Could not insert user into user collection')});
            }
            else {
              console.log('Failed to hash password');
              console.log(err);
            }
          });
        }
      }
      else {
        console.log('Error when trying to query the user collection');
      }
    })
  });
  console.log('Known users are configured');

  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });

  // Home Page
  app.get('/', authenticateToken, (req, res) => {
    if (req.user) {
      res.sendFile(path.join(__dirname + '/html/home.html'));
    }
    else {    // No user is logged in so return the login page
      res.redirect('/login');
    }
  });

  // Profile Page
  app.get('/profile', authenticateToken, (req, res) => {
    if (req.user) {
      res.sendFile(path.join(__dirname + '/html/profile.html'));
    }
    else {    // No user is logged in so return the login page
      res.redirect('/login');
    }
  });

  // Quizzes Page
  app.get('/quizzes', authenticateToken, (req, res) => {
    if (req.user) {
      res.sendFile(path.join(__dirname + '/html/quizzes.html'));
    }
    else {    // No user is logged in so return the login page
      res.redirect('/login');
    }
  });

  // Login Page
  app.get('/login', authenticateToken, (req, res) => {
    if (!req.user) {
      res.sendFile(path.join(__dirname + '/html/login.html'));
    }
    else {
      res.redirect('/');    // Redirect to home page if user is logged in
    }
  });

  app.get('/service/get-quizzes', authenticateToken, (req, res) => {
    if (req.user) {

    }
    else {    // No user is logged in so return the login page
      res.redirect('/login');
    }
  });

  // Login User
  app.post('/login-user', (req, res) => {
    const login = req.body.login
    const user = { name: login };

    collectionUsers.findOne({login: login}, (err, result) => {
      if (!err) {
        if (result) {
          bcrypt.compare(req.body.password, result.password, (err, compareResult) => {
            if (!err) {
              if (compareResult) {
                const accessToken = jwt.sign(user, process.env.TOKEN_SECRET);
                res.cookie('JwtToken', accessToken, { maxAge: 253402300000000});
                res.json({ status: 'success' });
                return;
              }
              else {
                console.log('Password is incorrect');
                res.status(403).json({status: 'failed'});
              }
            }
            else {
              console.log('Error when trying to compare hashes');
              console.log(err);
              res.status(500).json({status: 'failed'});
            }
          });
        }
        else {
          console.log('User doesn\'t exist');
          res.status(403).json({status: 'failed'});    // Permission denied
          return;
        }
      }
      else {
        console.log('Error when querying user collection');
        console.log(err);
        res.status(500).json({status: 'failed'});   // Internal server error
        return;
      }
    });
  });

  app.post('/logout', authenticateToken, (req, res) => {
    console.log('Received request to delete token cookie');
    res.clearCookie('JwtToken', {maxAge: 0});   // Delete the cookie
    res.status(200).json({status: 'success'});
  });

  // Create Quiz
  app.post('/service/create-quiz', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      console.log('Received request to add quiz to quizzes collection')
      if (!req.body.name || !req.body.questions || !req.body.date || !req.body.owner) {
        console.log("Not all details were provided");
        res.json(response);
        return;
      }
      collectionQuizzes.insertOne({
        name: req.body.name,
        questions: req.body.questions,
        date: req.body.date,
        owner: req.body.owner
      }, (err, result) => {
        if (!err) {
          console.log('Successfully added quiz to quizzes collection');
          response.status = 'success';
          res.json(response);
          return;
        }
        else {
          console.log('Error inserting new quiz into quizzes collection');
          console.log(err);
          res.json(response);
          return;
        }
      });
    }
    else {    // No user is logged in so return permission denied
      res.status(403).json(response);
    }
  });

  // Authenticate user and permissions of user
  function authenticateToken(req, res, next) {
    const token = req.cookies.JwtToken;   // Get JWT from cookies

    console.log('Authenticating user');

    if (token == null) return next();    // No token provided

    console.log(`Got token: ${token}`);
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
      if (!err) {
        collectionUsers.findOne({login: user.name}, (err, result) => {
          if (!err) {
            if (result) {
              req.perms = result.permissions;
              console.log(`User is: ${user.name}`);
              console.log(`User permissions are: ${req.perms}`);
              req.user = user.name;
              return next();
            }
            else {    // User doesn't exist
              console.log(`User doesn't exist in user collection: ${user.name}`);
              return res.status(403);
            }
          }   // Internal server error
          else {
            console.log('Internal server error when trying to find user in users collection');
            return res.status(500);
          }
        });
      }
      else {
        console.log('Token could not be verified, is the user logged in?');
        return next();   // No user logged in
      }
    });
  }
});
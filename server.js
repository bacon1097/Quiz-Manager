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
const { rejects } = require('assert');
const { ObjectId } = require('mongodb');
const { restart } = require('nodemon');
const favicon = require('serve-favicon');

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('html'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(favicon(path.join(__dirname + '/public/assets/favicon.ico')));

const PERMS = {   // Permissions for users
  ADMIN: "EDIT",
  CONTRIBUTOR: "VIEW",
  VIEWER: "RESTRICTED"
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

  // Start the server
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

  app.get('/service/get-quiz-details', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      if (req.query.id) {
        console.log('Received request to get all details of quiz: ' + req.query.id);
        if (hasHigherPerms(req.permissions)) {
          collectionQuizzes.findOne({_id: ObjectId(req.query.id)}, (err, result) => {
            if (!err) {
              if (result) {
                response = {
                  status: 'success',
                  body: result
                }
                res.json(response);
              }
              else {
                console.log('Quiz does not exist');
                res.status(401).json(response);
              }
            }
            else {
              console.log('Failed to get quiz details: ' + req.body.id);
              res.status(500).json(response);
            }
          });
        }
        else {
          console.log('Invalid permissions to get quiz details');
          res.status(403).json(response);
        }
      }
      else {
        console.log('No ID provided');
        res.status(401).json(response);
      }
    }
    else {
      console.log('No user logged in');
      res.status(401).json(response);
    }
  });

  // Get the available quizzes
  app.get('/service/get-quizzes', authenticateToken, async (req, res) => {
    if (req.user) {
      var htmlString = '';

      await collectionQuizzes.find().forEach((doc) => {   // Await to load full html string
        htmlString += '<div class="card">';    // Anchor tag for quiz
        htmlString += `<h3 class="quiz-title"><a href="/quiz?id=${doc._id}">${doc.name}</a></h3>`;   // Title of quiz
        if (hasHigherPerms(req.permissions)) {   // If permissions are there then add another button
          htmlString += `<a class="btn middle-btn quiz-edit" href="/quiz-manager/${doc._id}">Edit</a>`;
        }
        if (isAdmin(req.permissions)) {
          htmlString += `<a class="btn middle-btn quiz-delete" data-href="/service/delete-quiz?id=${doc._id}">Delete</a>`;
        }
        htmlString += `<p>${doc.date}</p>`;
        htmlString += '</div>';
      });

      res.send(htmlString);
    }
    else {    // No user is logged in so return the login page
      res.redirect('/login');
    }
  });

  // Edit an existing quiz
  app.get('/quiz-manager/:id', authenticateToken, (req, res) => {
    if (req.user) {
      if (hasHigherPerms(req.permissions)) {    // Contributor or admin
        res.sendFile(path.join(__dirname + '/html/quiz-manager.html'));
      }
      else {
        console.log('Invalid permissions to edit quiz')
        res.redirect('/');
      }
    }
    else {    // No user is logged in so return the login page
      console.log('No user logged in');
      res.redirect('/login');
    }
  });

  // Get a specific quiz
  app.get('/quiz', authenticateToken, (req, res) => {
    if (req.user && req.query.id) {
      res.sendFile(path.join(__dirname + '/html/quiz.html'));
    }
    else {
      res.redirect('/login');
    }
  });

  // Create quiz
  app.get('/quiz-manager', authenticateToken, (req, res) => {
    if (req.user) {
      if (isAdmin(req.permissions)) {
        res.sendFile(path.join(__dirname + '/html/quiz-manager.html'));
      }
      else {
        res.redirect('/');
      }
    }
    else {
      res.redirect('/login');
    }
  });

  // Get the questions and title for the quiz
  app.get('/service/quiz-questions', authenticateToken, async (req, res) => {
    if (req.user) {
      if (req.query.id) {
        collectionQuizzes.findOne({_id: ObjectId(req.query.id)}, async (err, result) => {
          if (!err) {
            if (result) {
              var questions = result.questions;
              await questions.forEach((q) => {
                delete q["answer"];   // Delete the answers from each question
                if (q.answers) {
                  shuffle(q.answers);
                }
              });
              res.json({status: 'success', questions: questions, title: result.name});
            }
            else {
              console.log('Quiz could not be found in quizzes collection');
              res.status(401).json({status: 'failed'});
            }
          }
          else {
            console.log('Failed to query quizzes collection');
            res.status(500).json({status: 'failed'})
          }
        });
      }
      else {
        console.log('No ID provided');
        res.status(401).json({status: 'failed'});
      }
    }
    else {
      console.log('Permission denied to view quizzes collection');
      res.status(403).json({status: 'failed'});
    }
  });

  // Get username of the user logged in
  app.get('/service/get-username', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      response = {
        status: 'success',
        user: req.user
      }
      res.json(response);
    }
    else {
      res.status(403).json(response);
    }
  });

  // Get user permissions
  app.get('/service/get-permissions', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      response = {
        status: 'success',
        permissions: req.permissions
      }
      res.json(response);
    }
    else {
      res.status(403).json(response);
    }
  });

  // Delete a quiz
  app.post('/service/delete-quiz', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      if (req.query.id) {
        var quizId = req.query.id;
        console.log(`Received request to delete quiz: ${quizId}`);
        if (isAdmin(req.permissions)) {
          collectionQuizzes.deleteOne({_id: ObjectId(quizId)}, (err, result) => {
            if (!err) {
              console.log(`Delete quiz: ${quizId}`);
              response.status = 'success';
              res.status(200).json(response);
            }
            else {
              console.log(`Failed to delete quiz: ${quizId}`);
              res.status(500).json(response);
            }
          });
        }
        else {    // User is not an admin
          console.log('Invalid permissions to delete quiz')
          res.status(403).json(response);
        }
      }
      else {    // No ID provided
        console.log('No ID provided to delete');
        res.status(401).json(response);
      }
    }
    else {    // No user is logged in
      console.log('No user logged in');
      res.status(401).json(response);
    }
  });

  // Submit answers
  app.post('/service/submit-answers', authenticateToken, (req, res) => {
    if (req.user) {
      if (req.query.id && req.body.answers && req.body.answers instanceof Array) {
        collectionQuizzes.findOne({_id: ObjectId(req.query.id)}, async (err, result) => {
          if (!err) {
            if (result) {
              var correctAnswers = 0;
              await req.body.answers.forEach((ans, index) => {
                if (ans.toLowerCase().trim() === result.questions[index].answer.toLowerCase().trim()) {
                  correctAnswers++;
                }
              });
              res.json({status: 'success', correctAnswers: correctAnswers});
            }
            else {
              console.log('Quiz could not be found in quizzes collection');
              res.status(401).json({status: 'failed'});
            }
          }
          else {
            console.log('Failed to query quizzes collection');
            res.status(500).json({status: 'failed'})
          }
        });
      }
      else {
        console.log('No ID or body array provided');
        res.status(401).json({status: 'failed'});
      }
    }
    else {
      console.log('Permission denied to submit answers');
      res.status(403).json({status: 'failed'});
    }
  });

  // Login User
  app.post('/login-user', (req, res) => {
    const login = req.body.login
    const user = { name: login };

    if (!user || !req.body.password) {
      return res.status(422).json({status: 'failed'});
    }

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

  // Update credentials
  app.post('/service/update-user', authenticateToken, async (req, res) => {
    var response = {status: 'failed'};

    if (!req.user) {    // Check if user has been authenticated
      console.log('No user logged in');
      res.status(401).json(response);
      return;
    }

    if (!req.body.username || !req.body.password || !req.body.passwordRepeat) {   // Check if all data is provided
      console.log('Not all data provided to server');
      res.status(500).json(response);
      return;
    }

    if (req.body.password !== req.body.passwordRepeat) {    // Check if passwords match
      console.log('Passwords do not match');
      res.status(406).json(response);
      return;
    }

    if (req.body.username !== req.user) {   // Requesting a name change
      // Check if the user exists already
      var existingUser = await collectionUsers.findOne({login: req.body.username});
      if (existingUser) {   // A user already exists with the same name
        console.log('Could not change user "' + req.user + '" to "' + req.body.username + '" since name is taken');
        res.status(409).json(response);
        return;
      }
    }

    // Hash the password
    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
      if (err) {
        console.log('Failed to hash password');
        res.status(500).json(response);
        return;
      }

      if (hash) {
        // Update the user
        collectionUsers.updateOne({login: req.user}, {
          $set: {
            login: req.body.username,
            password: hash
          }
        }, (err, result) => {
          if (err) {
            console.log('Failed to save user information : ' + req.user);
            res.status(500).json(response);
            return;
          }
          else {
            res.clearCookie('JwtToken', {maxAge: 0});   // Delete the cookie so the user is taken to the login page
            console.log('Successfully saved user information: ' + req.body.username);
            response.status = 'success';
            res.json(response);
          }
        });
      }
      else {
        console.log('Failed to hash password');
        res.status(500).json(response);
        return;
      }
    });
  });

  // Logout the user
  app.post('/logout', authenticateToken, (req, res) => {
    console.log('Received request to delete token cookie');
    res.clearCookie('JwtToken', {maxAge: 0});   // Delete the cookie
    res.status(200).json({status: 'success'});
  });

  // Create or update a quiz
  app.post('/service/create-quiz', authenticateToken, (req, res) => {
    var response = {status: 'failed'};
    if (req.user) {
      if (isAdmin(req.permissions)) {
        console.log('Received request to add/update quiz in quizzes collection')
        if (!req.body.name.replace(/\s/g, '').length || !req.body.questions || !req.body.date || !req.body.questions instanceof Array) {
          console.log("Not all details were provided");
          res.json(response);
          return;
        }
        var quiz = {
          name: req.body.name,
          questions: req.body.questions,
          date: req.body.date,
          owner: req.user
        };
        if (req.body._id) {
          quiz._id = ObjectId(req.body._id);
        }
        if (req.body.existingQuiz) {
          collectionQuizzes.update({_id: quiz._id}, quiz, (err, result) => {
            if (!err) {
              console.log('Successfully updated quiz in quizzes collection');
              response.status = 'success';
              res.json(response);
              return;
            }
            else {
              console.log('Error update existing quiz into quizzes collection');
              console.log(err);
              res.json(response);
              return;
            }
          });
        }
        else {
          collectionQuizzes.insertOne(quiz, (err, result) => {
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
      }
      else {    // User does not have permissions
        console.log('Invalid permissions - Cannot create quiz');
        res.status(403).json(response);
      }
    }
    else {    // No user is logged in so return permission denied
      console.log('User is not logged in - Cannot create quiz');
      res.status(401).json(response);
    }
  });

  // Authenticate user and permissions of user
  function authenticateToken(req, res, next) {
    const token = req.cookies.JwtToken;   // Get JWT from cookies

    if (token == null) return next();    // No token provided

    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
      if (!err) {
        collectionUsers.findOne({login: user.name}, (err, result) => {
          if (!err) {
            if (result) {
              req.permissions = result.permissions;
              req.user = user.name;
              return next();
            }
            else {    // User doesn't exist
              console.log(`User doesn't exist in user collection: ${user.name}`);
              res.clearCookie('JwtToken', {maxAge: 0});   // Delete the cookie
              return res.redirect('/login');
              // return res.status(403);
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

  // Shuffle the array
  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  // Check if the user has contributor or admin permissions
  function hasHigherPerms(perms) {
    if (perms === PERMS.ADMIN || perms === PERMS.CONTRIBUTOR) {
      return true;
    }
    else {
      return false;
    }
  }

  // Check if the user has highest permissions
  function isAdmin(perms) {
    if (perms === PERMS.ADMIN) {
      return true;
    }
    else {
      return false;
    }
  }
});
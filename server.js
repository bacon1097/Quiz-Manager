const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://admin:admin@quiz-manager-cluster.hi5x3.mongodb.net/<dbname>?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const bcrypt = require('bcrypt');
const saltRounds = 10;
const path = require('path');

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('html'));

client.connect(err => {
  const collectionUsers = client.db('users').collection('users');
  const collectionQuizzes = client.db('quizzes').collection('quizzes');

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/html/home.html'));
  });

  app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname + '/html/profile.html'));
  });

  app.get('/quizzes', (req, res) => {
    res.sendFile(path.join(__dirname + '/html/quizzes.html'));
  });

  app.post('/service/create-user', (req, res) => {
    var response = {status: 'failed'};
    if (!req.body.email || !req.body.password) {
      res.json(response);
      return;
    }
    console.log('Received request to create user');
    if (req.body.email.includes('@') && ! req.body.email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
      console.log('Email is not valid');
      res.status(400).json(response);
      return;
    }
    collectionUsers.findOne({email: req.body.email}, (err, result) => {
      if (result) {
        console.log('User already exists');
        res.status(409).json(response);
        return;
      }
      else {
        bcrypt.genSalt(saltRounds, (err, salt) => {
          if (!err) {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
              if (!err) {
                collectionUsers.insertOne({
                  email: req.body.email,
                  password: hash,
                  picture: 'new-user.svg'
                }, (err, result) => {
                  if (!err) {
                    console.log('Successfully added user to users collection');
                    response.status = 'success';
                    res.json(response);
                    return;
                  }
                  else {
                    console.log('Failed to insert document into users collection');
                    console.log(err);
                    res.json(response);
                    return;
                  }
                })
              }
              else {
                console.log('Failed to hash password');
                console.log(err);
                console.log(req.body);
                res.json(response);
                return;
              }
            });
          }
          else {
            console.log('Failed to create salt');
            console.log(err);
            res.json(response);
            return;
          }
        });
      }
    });
  });

  app.post('/service/create-quiz', (req, res) => {
    var response = {status: 'failed'};
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
  });
});
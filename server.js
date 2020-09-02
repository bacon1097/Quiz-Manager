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

app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('html'));

const PERMS = {   // Permissions for users
  ADMIN: "ADMIN",
  CONTRIBUTOR: "CONTRIBUTOR",
  VIEWER: "VIEWER"
};

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

  app.post('/login' , (req, res) => {
    const username = req.body.username
    const user = { name: username };

    const accessToken = jwt.sign(user, process.env.TOKEN_SECRET);
    res.json({ accessToken: accessToken });
  });
});
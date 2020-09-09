<!-- TABLE OF CONTENTS -->
## Table of Contents

* [About the Project](#about-the-project)
  * [Built With](#built-with)
* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installation](#installation)
* [Notes](#notes)
* [Contact](#contact)



<!-- ABOUT THE PROJECT -->
## About The Project
This repository holds the code for the Quiz Manager created for WebbiSkools Ltd.



### Built With

* [ExpressJS](https://expressjs.com/)
* [jQuery](https://jquery.com/)



<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* npm
```sh
npm install npm@latest -g
```
* node

### Installation

1. Clone the repo
```sh
git clone https://github.com/bacon1097/Quiz-Manager.git
```
1. Install NPM packages
```sh
npm install
```
1. Create .env file
```sh
echo "MONGO_URI=mongodb+srv://admin:admin@quiz-manager-cluster.hi5x3.mongodb.net/quiz-manager-cluster?retryWrites=true&w=majority
TOKEN_SECRET=50aac40ffdbb308546d21c1835dd13c6e4ceb2839f1ecac0f09cfacad67a3c63221e074a7f8cf2c811676cc3222629545568e96a75fda9dbb5bf97fc4892e58e" > .env
```
1. Run server
```sh
node server.js
```



<!-- USAGE EXAMPLES -->
## Notes

* .env file
  * The .env file contains details such as the secret used for hasing password as well as the database URI for connecting.
  This file is not part of this package but should be created by a user.
* known_users.json
  * This file contains the core users that are to be created when starting the server. If changing this file, ensure to modify the
  database directly to delete users etc...
* User permissions - There are 3 core user permissions:
  * **EDIT** - Highest permissions. Can edit, delete and create quizzes.
  * **VIEW** - High permissions. Cannot edit, delete or create quizzes but can view answers.
  * **RESTRICTED** - Normal permissions. Can only answer quizzes. Cannot see answers.


<!-- CONTACT -->
## Contact

Ben Brunyee - brunyeeb@gmail.com

Project Link: [https://github.com/bacon1097/Quiz-Manager](https://github.com/bacon1097/Quiz-Manager)
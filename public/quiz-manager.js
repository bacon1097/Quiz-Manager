import { loadSidebar } from '/modules/common.js';

$(document).ready(() => {
  loadSidebar();
  var invalidReg = /[^\s\x30-\x39\x41-\x5A\x61-\x7A?]/;

  var currentQuestion = 1;
  var quiz = {
    name: '',
    questions: [],
    date: '',
  };

  quizModificationCheck();

  $.ajax({
    url: '/service/get-permissions',
    type: 'GET',
    success: result => {
      if (result && result.status === 'success') {
        if (result.permissions === 'EDIT') {
          $('.block-container').append($.parseHTML('<div class="btn question-buttons" id="submit-button">Submit Quiz</div>'));
          $('.block-container').append($.parseHTML('<div class="btn question-buttons" id="add-button">Add Question</div>'));
          $('.block-container').append($.parseHTML('<div id="delete-button" class="btn question-buttons">Delete Question</div>'));
        }
      }
      else {
        console.log('Could not get user permissions');
      }
      checkButtonVisibility();
    }
  });

  $('#back-button').click(async () => {
    if (await addOrUpdateQuestion()) {
      currentQuestion--;
      await loadQuestion();
    }
    else {
      invalidInputError('Please fill out the entire form - Ensure that there are no special characters');
    }
    changeQuestionTitle();
    checkButtonVisibility();
  });

  $('#next-button').click(async () => {
    if (await addOrUpdateQuestion()) {
      currentQuestion++;
      if (currentQuestion <= quiz.questions.length) {
        await loadQuestion();
      }
      else {
        await clearFields();
      }
    }
    else {
      invalidInputError('Please fill out the entire form - Ensure that there are no special characters');
    }
    changeQuestionTitle();
    checkButtonVisibility();
  });

  $('.block-container').on('click', '#add-button', async () => {
    quiz.questions.splice(currentQuestion, 0, {
      question: '',
      type: 'input',
      answer: ''
    });
    if (await addOrUpdateQuestion()) {
      currentQuestion++;
      await loadQuestion();
    }
    else {
      invalidInputError('Please fill out the entire form - Ensure that there are no special characters');
    }
    changeQuestionTitle();
    checkButtonVisibility();
  });

  $('.block-container').on('click', '#delete-button', async () => {
    quiz.questions.splice(currentQuestion - 1, 1);
    if (currentQuestion > 1) {
      currentQuestion--;
    }
    else {
    }
    if (quiz.questions.length != 0) {
      await loadQuestion();
      changeQuestionTitle();
    }
    else {
      await clearFields();
    }
    checkButtonVisibility();
  });

  $('.block-container').on('click', '#submit-button', async () => {
    if ($('#name-quiz').val().replace(/\s/g, '').length) {
      if (await isValidInput()) {
        await addOrUpdateQuestion();
      }
      if (quiz.questions.length > 0) {
        quiz.date = new Date().today() + ' ' + new Date().timeNow();
        quiz.name = $('#name-quiz').val();

        if (quiz.name.match(invalidReg)) {
          invalidInputError('Ensure that there are no special characters in quiz name');
          return;
        }
        $.ajax({
          url: '/service/create-quiz',
          type: 'POST',
          data: quiz,
          success: (result) => {
            if (result && result.status === 'success') {
              console.log('Quiz created/updated');
              window.location = '/quizzes';
            }
            else {
              invalidInputError('Failed to create/update quiz - try again later');
            }
          },
          error: (err) => {
            console.log(err);
            if (err.status == 403) {
              invalidInputError('Failed to create/update quiz - Invalid permissions');
            }
            invalidInputError('Failed to create/update quiz - try again later');
          }
        });
      }
      else {
        invalidInputError('No questions in quiz');
      }
    }
    else {
      invalidInputError('Please provide a title for the quiz');
    }
  });

  $('#question-answers').on('click', '#add-list-option', () => {
    $('#question-answers #add-list-option').before($.parseHTML('<input type="text" placeholder="Option" class="answer-option">'));
  })

  $('select#question-type-input').change(() => {
    var answerType = $('select#question-type-input').val();
    $('#question-answers').empty();
    if (answerType === 'input') {
      $('#question-answers').append($.parseHTML('<input type="text" placeholder="Answer" class="answer-option" id="input-question-answer">'));
    }
    else if (answerType === 'list') {
      $('#question-answers').append($.parseHTML('<input type="text" placeholder="Answer" class="answer-option" id="list-answer">' +
        '<div class="btn" id="add-list-option">+</div>'));
    }
    else {
      console.log('Answer type is not valid');
    }
  });

  function checkButtonVisibility() {
    if (currentQuestion == 1) {
      $('#back-button').css({display: 'none'});
    }
    if (currentQuestion > 1) {
      $('#back-button').css({display: 'inline-block'});
    }

    if (currentQuestion == quiz.questions.length || quiz.questions == 0) {
      $('#next-button').css({display: 'none'});
    }
    if (currentQuestion < quiz.questions.length) {
      $('#next-button').css({display: 'inline-block'});
    }

    if (quiz.questions.length == 1) {
      $('#delete-button').css({display: 'none'});
    }
    if (quiz.questions.length != 1) {
      $('#delete-button').css({display: 'inline-block'});
    }
  }

  async function isValidInput() {
    var question = $('#question-input').val();
    var questionType = $('#question-type-input').val();
    var questionAnswer;
    var answerOptions = []

    if (questionType === 'input') {
      questionAnswer = $('.answer-option').val();
    }
    else if (questionType === 'list') {
      questionAnswer = $('#list-answer').val();
      await $.each($('.answer-option'), (i, elem) => {
        answerOptions.push($(elem).val());
      });
    }
    else {
      return false;
    }

    if (question && questionType && questionAnswer) {
      if (question.match(invalidReg) || questionAnswer.match(invalidReg)) {
        return false;
      }

      for (var elem of answerOptions) {
        if (elem.match(invalidReg)) return false;
      }

      return true;
    }
    else {
      return false;
    }
  }

  async function addOrUpdateQuestion() {
    var questionData = {
      question: '',
      type: '',
      answer: '',
    };

    if (await isValidInput()) {
      var question = $('#question-input').val().replace(/\??$/, '');
      var questionType = $('#question-type-input').val();
      var questionAnswer;

      questionData.question = question;
      questionData.type = questionType;

      if (questionType === 'input') {
        questionAnswer = $('.answer-option').val();
        if (!questionAnswer) {
          console.log('Answer not provided');
          return response;
        }
        else {
          questionData.answer = questionAnswer;
        }
      }
      else if (questionType === 'list') {
        questionAnswer = $('#list-answer').val();
        if (!questionAnswer) {
          console.log('Answer not provided');
          return response;
        }
        else {
          questionData.answer = questionAnswer;
          questionData.answers = [];
          await $.each($('.answer-option'), (i, elem) => {
            questionData.answers.push($(elem).val());
          });
        }
      }

      if (quiz.questions.length >= currentQuestion) {
        quiz.questions[currentQuestion - 1] = questionData;
      }
      else {
        quiz.questions.push(questionData);
      }
      return true;
    }
    else {
      return false;
    }
  }

  async function loadQuestion() {
    var question = quiz.questions[currentQuestion - 1];

    clearFields();

    $('#question-input').val(question.question);
    $('#question-type-input').val(question.type);
    $('#question-type-input').change();

    if (question.type === 'input') {
      $('.answer-option').val(question.answer);
    }
    else if (question.type === 'list') {
      $('#list-answer').val(question.answer);
      await question.answers.forEach((elem) => {
        if (elem !== question.answer) {
          $('#question-answers #add-list-option').before($.parseHTML('<input type="text" ' +
            'placeholder="Option" class="answer-option" value="' + elem + '">'));
        }
      });
    }
  }

  function clearFields() {
    $('#question-answers').empty();
    $('#question-input').val('');
    $('#question-type-input').val('');
    $('.no-input-error').remove();
  }

  function invalidInputError(msg) {
    $('.no-input-error').remove();
    $('.block-container').append($.parseHTML('<p class="no-input-error">' + msg + '</p>'));
  }

  function quizModificationCheck() {
    var url = window.location.href.split('/');
    var quizId = url[4];

    if (quizId) {
      $.ajax({
        url: `/service/get-quiz-details?id=${quizId}`,
        type: 'GET',
        success: result => {
          if (result && result.status === 'success') {
            quiz = result.body
            quiz._id = quizId;
            quiz.existingQuiz = true;
            $('#name-quiz').val(quiz.name);
            changeQuestionTitle();
            loadQuestion();
          }
          else {
            invalidInputError('Failed to get quiz details');
          }
        },
        error: err => {
          console.log(err);
          invalidInputError('Failed to get quiz details');
        }
      });
    }
  }

  function changeQuestionTitle() {
    $('h2').text(`Question ${currentQuestion}/${quiz.questions.length}`)
  }

  Date.prototype.today = function () {
    return ((this.getDate() < 10)?"0":"") + this.getDate() +"/"+(((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) +"/"+ this.getFullYear();
  }

  Date.prototype.timeNow = function () {
    return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
  }
});
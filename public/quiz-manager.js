import { loadSidebar } from '/modules/common.js';
$(document).ready(() => {
  loadSidebar();

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
        if (result.permissions === 'ADMIN') {
          $('.block-container').append($.parseHTML('<div class="btn question-buttons" id="submit-button">Submit Quiz</div>'));
        }
      }
      else {
        console.log('Could not get user permissions');
      }
    }
  });

  $('#next-button').click(async () => {
    if (await addOrUpdateQuestion()) {
      currentQuestion++;
      if (quiz.questions.length >= currentQuestion) {
        await loadQuestion();
      }
      else {
        await newQuestion();
      }
      changeQuestionTitle();
      if (currentQuestion > 1) {
        $('#back-button').css({display: 'inline-block'});
      }
    }
    else {
      invalidInputError('Please fill out the entire form');
    }
  });

  $('#back-button').click(async () => {
    currentQuestion--;
    await loadQuestion();
    changeQuestionTitle();
    if (currentQuestion <= 1) {
      $('#back-button').css({display: 'none'});
    }
  });

  $('.block-container').on('click', '#delete-button', () => {
    quiz.questions.splice(currentQuestion - 1, 1);
    currentQuestion--;
    loadQuestion();
    changeQuestionTitle();
  });

  $('.block-container').on('click', '#submit-button', async () => {
    if ($('#name-quiz').val()) {
      if (isValidInput()) {
        await addOrUpdateQuestion();
      }
      if (quiz.questions.length > 0) {
        quiz.date = new Date().today() + ' ' + new Date().timeNow();
        quiz.name = $('#name-quiz').val();
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

  function isValidInput() {
    var question = $('#question-input').val();
    var questionType = $('#question-type-input').val();
    var questionAnswer;

    if (questionType === 'input') {
      questionAnswer = $('.answer-option').val();
    }
    else if (questionType === 'list') {
      questionAnswer = $('#list-answer').val();
    }
    else {
      return false;
    }

    if (question && questionType && questionAnswer) {
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

    if (isValidInput()) {
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

    newQuestion();

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

  function newQuestion() {
    $('#question-answers').empty();
    $('#question-input').val('');
    $('#question-type-input').val('');
    $('.no-input-error').remove();
  }

  function invalidInputError(msg) {
    if (!$('.no-input-error').length) {
      $('.block-container').append($.parseHTML('<p class="no-input-error">' + msg + '</p>'));
    }
  }

  function quizModificationCheck() {
    var url = window.location.href.split('/');
    var quizId = url[4];
    console.log(quizId);

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
            $('.block-container').append($.parseHTML('<div id="delete-button" class="btn question-buttons">Delete Question</div>'));
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
import { loadSidebar } from '/modules/common.js';
$(document).ready(() => {
  loadSidebar();
  const urlParams = new URLSearchParams(window.location.search);
  var qID = urlParams.get('id');
  var questionCounter = 0;
  var questions = [];
  var answers = [];

  $.ajax({
    url: `/service/quiz-questions?id=${qID}`,
    type: 'GET',
    success: async (result) => {
      if (result.status && result.status === 'success') {
        questions = result.questions
        $('h1').text(result.title);
        await loadQuestion(questionCounter);
      }
    },
    error: (err) => {
      console.log(err);
      $('section h2').text('Error occured loading quiz');
    }
  });

  $('div').on('click', '#next-button', () => {
    if (questionCounter + 1 < questions.length) {
      if (addAnswer()) {
        questionCounter++;
        loadQuestion(questionCounter);
      }
      else {
        noInputError();
      }
    }
    console.log(answers);
  });

  $('div').on('click', '#back-button', () => {
    if (questionCounter + 1 > 1) {
      questionCounter--;
      answers.pop()
      loadQuestion(questionCounter);
    }
    console.log(answers);
  });

  $('div').on('click', '#submit-button', () => {
    if (addAnswer()) {
      $.ajax({
        url: `/service/submit-answers?id=${qID}`,
        type: 'POST',
        data: {
          answers: answers
        },
        success: (result) => {
          if (result.status && result.status === 'success') {
            $('section h2').text('Your results');
            $('section div.block-container').empty();
            $('section div.block-container').append($.parseHTML(`<p class="question">You got:<br>${result.correctAnswers}/${questions.length}</p>`));
          }
        },
        error: (err) => {
          console.log(err);
          $('section h2').text('Error occured when submitting your results');
          $('section div.block-container').empty();
        }
      });
    }
    else {
      noInputError();
    }
  });

  // Load the question to the page
  async function loadQuestion(num) {
    $('section h2').text('Question ' + (parseInt(num) + 1) + '/' + questions.length);
    var question = questions[num].question;
    var htmlString = `<p class="question">${question.trim()}?</p>`;
    if (questions[num].type.trim() === 'input') {
      htmlString += `<input type="text" class="input-answer">`;
    }
    else if (questions[num].type.trim() === 'list') {
      await questions[num].answers.forEach((answer, i) => {
        htmlString += `<div><input type="radio" name="answers" class="radio-input" value="${answer}"><label>` + String.fromCharCode(65 + i) + `. ${answer.trim()}</label></div>`;
      });
    }
    else {
      console.log(`${questions[num].type} type does not exist`)
    }
    htmlString += '<div class="btn question-buttons" id="back-button">Back</div>';
    htmlString += '<div class="btn question-buttons" id="next-button">Next</div>';
    $('section div.block-container').empty();
    $('section div.block-container').append($.parseHTML(htmlString));

    if (num + 1 == questions.length) {
      $('#next-button').remove();
      $('section div.block-container').append($.parseHTML('<div class="btn question-buttons" id="submit-button">Submit</div>'));
    }

    if (num + 1 == 1) {
      $('#back-button').remove();
    }
  }

  function addAnswer() {
    var answerInput;
    var result = false;

    if (questions[questionCounter].type === 'input') {
      answerInput = $('div.block-container').find('input.input-answer').val();
      if (answerInput.replace(/\s/g, '').length) {
        answers.push(answerInput);
        result = true;
        return result;
      }
      else {
        console.log('No answer provided');
        return result;
      }
    }
    else if (questions[questionCounter].type === 'list') {
      answerInput = $('div.block-container').find('input[name="answers"]:checked').val();
      if (answerInput) {
        answers.push(answerInput);
        result = true;
        return result;
      }
      else {
        console.log('No answer provided');
        return result;
      }
    }
    else {
      console.log('Type doesn\'t exist');
      return result;
    }
  }

  function noInputError() {
    if (!$('section div.block-container').find('p.no-input-error').length) {
      $('section div.block-container').append($.parseHTML('<p class="no-input-error">Please provide an answer before moving on</p>'));
    }
  }
});
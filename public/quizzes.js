$(document).ready(() => {
  $.ajax({
    url: '/service/get-quizzes',
    type: 'GET',
    success: (result) => {
      $('.card-container').append($.parseHTML(result));
    }
  });
});
$(document).ready(() => {
  $.ajax({
    url: '/service/get-quizzes',
    type: 'GET',
    success: result => {
      var cards = $.parseHTML(result);

      $(cards).each((i, elem) => {
        var deleteButton = $(elem).find('a.quiz-delete');
        if (deleteButton) {
          $(deleteButton).click(() => {
            $.ajax({
              url: $(deleteButton).attr('data-href'),
              type: 'POST',
              success: result => {
                if (!result || !result.status === 'success') {
                  alert('Failed to delete quiz');
                }
                location.reload();
              }
            });
          })
        }

        $('.card-container').append($(elem));
      });
    }
  });
});
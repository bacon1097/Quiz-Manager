import { loadSidebar } from '/modules/common.js';
$(document).ready(() => {
  $.ajax({
    url: '/service/get-permissions',
    type: 'GET',
    success: result => {
      if (result && result.status === 'success') {
        var perms = result.permissions;
        if (perms === 'ADMIN') {
          $('.card-container').append($.parseHTML(
            '<a href="/quiz-manager" class="card">' +
              '<ion-icon name="add-circle"></ion-icon>' +
              '<h3>Create Quizzes</h3>' +
            '</a>'
          ));
          loadSidebar(perms);
        }
      }
      else {
        console.log('Failed to get user permissions');
      }
    },
    error: err => {
      console.log(err);
      console.log('Failed to get user permissions');
    }
  });
});
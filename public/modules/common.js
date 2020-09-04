export function loadSidebar(perms=null) {
  if (!perms) {
    $.ajax({
      url: '/service/get-permissions',
      type: 'GET',
      success: result => {
        if (result && result.status === 'success') {
          addQuizManager(result.permissions);
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
  }
  else {
    addQuizManager(perms);
  }

  function addQuizManager(perms) {
    console.log('loaded');
    if (perms === 'ADMIN' || perms == 'CONTRIBUTOR') {
      $('#main-nav').append($.parseHTML(
        '<a href="/quiz-manager" class="icon-image">' +
          '<ion-icon name="add-circle-outline"></ion-icon>' +
        '</a>'
      ));
    }
  }
}
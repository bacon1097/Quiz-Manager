$(document).ready(() => {
  $('#log-out-btn').click(() => {
    $.ajax({
      url: '/logout',
      type: 'POST',
      success: result => {
        window.location = '/login';
      }
    });
  });
});
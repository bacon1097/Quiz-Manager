import { loadSidebar } from '/modules/common.js';
$(document).ready(() => {
  loadSidebar();

  $('#log-out-btn').click(() => {
    $.ajax({
      url: '/logout',
      type: 'POST',
      success: result => {
        window.location = '/login';
      }
    });
  });

  $('#save-creds-btn').click(() => {
    errorMessage('');
    var username = $('#username-input').val();
    var password = $('#password-input').val();
    var passwordRepeat = $('#password-repeat-input').val();

    if (!password || !passwordRepeat) {
      errorMessage('Please provide all details');
    }
    else {
      if (password !== passwordRepeat) {
        errorMessage('Password does not match');
      }
      else {
        $.ajax({
          url: '/service/update-user',
          type: 'POST',
          data: {
            username: username,
            password: password,
            passwordRepeat: passwordRepeat
          },
          success: result => {
            if (result && result.status === 'success') {
              console.log('Successfully updated user');
              window.location = '/login';
            }
            else {
              errorMessage('Failed to update user');
            }
          },
          error: err => {
            console.log(err);
            if (err.status == 409) {
              errorMessage('Username taken');
            }
            else if (err.status == 406) {
              errorMessage('Passwords do not match');
            }
            else if (err.status == 500) {
              errorMessage('Internal server error');
            }
            else if (err.status == 403) {
              errorMessage('Not all details provided to server');
            }
            else {
              errorMessage('Failed to update credentials');
            }
          }
        });
      }
    }
  });

  $.ajax({
    url: '/service/get-username',
    type: 'GET',
    success: (result) => {
      if (result && result.status === 'success' && result.user) {
        $('h2').text(`Hello, ${result.user}`);
      }
      else {
        console.log('Could not get username');
        $('h2').text(`Hello there`);
      }
    }
  });

  function errorMessage(msg) {
    $('.no-input-error').css({display: 'block'});
    $('.no-input-error').text(msg);
  }
});
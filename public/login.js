$(document).ready(() => {
  $('#login-button').click(() => {
    console.log("Button clicked")
    const username = $('#login-input').val();
    const password = $('#password-input').val();
    if (username && password) {
      $.ajax({
        url: 'login-user',
        type: 'POST',
        data: {
          login: username,
          password: password
        },
        success: function (result) {
          if (!result.status || !result.status === 'success') {
            console.log('Login failed');
            displayErrorMessage('Internal server error');
          }
          else {
            window.location = '/';
          }
        },
        error: function (err) {
          console.log('Login failed');
          console.log(err);
          if (err.status == 403) {
            displayErrorMessage('User doesn\'t exist or credentials were not correct');
          }
          else if (err.status === 500) {
            displayErrorMessage('Internal server error');
          }
          else if (err.status === 422) {
            displayErrorMessage('Please fill all fields');
          }
        }
      });
    }
    else if (!username) {
      displayErrorMessage('Please enter your username');
    }
    else if (!password) {
      displayErrorMessage('Please enter your password');
    }
  });

  $('#password-input').keypress((event) => {
    if (event.which == 13) {
      event.preventDefault();
      $('#login-button').click();
    }
  });

  function displayErrorMessage(msg) {
    $('#login-error').text(msg);
    $('#login-error').css({display: 'block'});
  }
});
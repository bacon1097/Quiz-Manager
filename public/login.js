$(document).ready(() => {
  $('#login-button').click(() => {
    console.log("Button clicked")
    const username = $('#login-input').val();
    const password = $('#password-input').val();
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
        }
        else {
          window.location = '/';
        }
      },
      error: function (result) {
        console.log('Login failed');
        console.log(result.status);
        if (result.status == 403) {
          $('#login-error').text('User doesn\'t exist or credentials were not correct');
        }
        else if (result.status === 500) {
          $('#login-error').text('Internal server error');
        }
        $('#login-error').css({display: 'block'});
      }
    });
  });
});
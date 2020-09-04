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
});
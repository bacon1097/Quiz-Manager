$(document).ready(() => {
  const localStorage = window.localStorage;
  localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiY29udHJpYnV0b3IiLCJpYXQiOjE1OTkwMzc3OTd9.dNUPloCwRGYkAA_h1obFpop8uoVNcc_OFI9uhAGJKPo');
  $.ajax({
    url: '/verify',
    type: 'POST',
    headers: {
      authorization: 'Bearer ' + localStorage.getItem('token')
    },
    success: function (msg) {
      console.log(msg);
    }
  })
});
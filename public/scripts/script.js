// Basic example
$(document).ready(function () {
    $('#dtBasicExample').DataTable({
      "paging": true // false to disable pagination (or any other option)
    });
    $('.dataTables_length').addClass('bs-select');
  });

//---------------NAVBAR METHODS---------------//
$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        $('#sidebar').toggleClass('active');
        $(this).toggleClass('active');
        $('.game-menu-container').toggleClass('col-md-8')
    });
});

var ch = document.querySelector("#check");

function check(theForm) {
    if(theForm.Terms_Conditions.checked == false) {
        $('#check').text('Please agree to the terms and conditions.')
        $('#check').fadeIn(300).delay(1600).fadeOut(300);
        return false;
    }
    else {
        return true;
    }
} 
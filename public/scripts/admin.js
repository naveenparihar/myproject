/*----------------------ADD USER---------------------------*/

var user = document.querySelector("#username");
var pass = document.querySelector("#password");
var msg = document.querySelector("#msg");
var passw = /^(?=.*[a-z])).{4,20}$/;
var uname = /\W/;

// var passw = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
function validate() {
    //console.log(user.value);
    //console.log(pass.value);

    if(user.value == "" || pass.value == "") {
        msg.textContent = "Username or Password cannot be empty.";
        return false;
    }

    else if(user.value.length < 4) {
        msg.textContent = "Username cannot be less than 4."
        return false;
    }

    else if(pass.value.length < 4) {
        msg.textContent = "Password cannot be less than 4";
        return false;
    }

    if(uname.test(user.value)) {
        msg.textContent = "Username can only include alphabets, numbers and underscore.";
        return false;
    }

    if(passw.test(pass.value)) {
        //console.log(user.value);
        //console.log(pass.value);
        //console.log("Valid Credentials.")
        msg.textContent = "User successfully added.";
        return true;
    }

    else {
        //console.log("Lowercase, uppercase or number missing.")
        msg.textContent = "Password must include a lowercase, uppercase and a number.";
        return false;
    }
}


/*-------------------------CHANGE PASSWORD-----------------------------*/

var opass = document.querySelector("#oldpass");
var npass = document.querySelector("#newpass");
var rpass = document.querySelector("#repass");

function change() {
    // console.log(opass.value);
     console.log(npass.value);
     console.log(rpass.value);
     //return false;

    if(npass.value.length < 8) {
        msg.textContent = "New Password less than 8.";
        return false;
    }

    if(passw.test(npass.value) && npass.value == rpass.value) {
        msg.textContent = "Password changed successfully.";
        return true;
    }

    else if(npass.value != rpass.value) {
        msg.textContent = "New Password does not match."
        return false;
    }

    else {
        msg.textContent = "New Password must include a lowercase, uppercase and a number.";
        return false;
    }

    return false;
}

/*-----------------------------ADD CREDITS-------------------------*/

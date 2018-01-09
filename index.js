var ALL_TIMES = ['3:40', '3:55', '4:10', '4:25', '4:40'];


$(document).ready(function () {
    var teams = [];
    var totalMem = 0;
    userTeam = null;
    database.ref('teams/').once('value').then(function (snapshot) {
        var teams = snapshot.val();
        for (var key in teams) {
            addTeam(teams[key], key);
        }
        $('#example').DataTable({
            paging: false
        });
    });

    function addTeam(team, key) {
        students = team.students.name.join("<br>");
        var resumeString = "";
        var resumes = team.students.resume;
        for (i = 0; i < resumes.length; i++) {
            resumeString += "<a class='resume' target='_blank' href='" + resumes[i] + "'>" + resumes[i] + "</a><br>";
        }
        var times = team.times;
        var timesString = "";
        for (i = 0; i < 10; i++) {
            timesString += "<td id='" + (key + i) + "' class='time'>"
                + times[i] + "</td>";
        }
        var string = "<tr><td id='" + key + "'";
        if (userTeam) {
            if (userTeam.id == key) {
                string += " style='background-color:#FFBC00; opacity:0.5'";
            }
        }
        string = string + "class='names'>" + students + "</td>" +
            "<td>" + resumeString + "</td>" + timesString + "</tr>";


        $('#body').append(string);
        $('.time').off().click(function (e) {
            onTimeClick(this);
        });
    }

    database.ref('teams/').on('value', function (snapshot) {
        var teams = snapshot.val();
        for (var key in teams) {
            for (i = 0; i < 10; i++) {
                var valFromServer = teams[key].times[i];
                var trString = "#" + key + i;
                var valInSite = $(trString).text();
                if (valFromServer != valInSite) {
                    if (userTeam && key == userTeam.id) {
                        userTeam.times[i] = valFromServer;
                    }
                    $(trString).text(valFromServer);
                }
            }
        }
    });

    function addToDB() {
        var team = database.ref('teams/').push();
        var students = {};
        students.name = [];
        students.resume = [];
        for (i = 0; i <= totalMem; i++) {
            var name = document.getElementsByName("name[]")[i].value;
            var resume = document.getElementsByName("resume[]")[i].value;
            students.name.push(name);
            students.resume.push(resume);
        }
        times = [];
        for (i = 0; i < 10; i++) {
            times[i] = "Available";
        }

        var email = document.getElementsByName("primaryEmail")[0].value;
        var password = document.getElementsByName("createPassword")[0].value;
        firebase.auth().createUserWithEmailAndPassword(email, password).then(function () {
            team.set({
                students: students,
                times: times,
                email: email
            });
            $('#createTeam').css('display', 'none');
            database.ref('teams/' + team.key).once('value').then(function (snapshot) {
                $('#example').DataTable().destroy();
                userTeam = snapshot.val();
                userTeam.id = team.key;
                addTeam(snapshot.val(), team.key);
                $("#login").text("logout " + userTeam.email);
                $("#add").css("display", "none");
                $('#example').DataTable({
                    paging: false
                });
            });
        }, function (error) {
            var errorMessage = error.message;
            console.log(errorMessage);
        });
    }

    $("#add").off().click(function (e) {
        totalMem = 0;
        $('#createTeam').css('display', 'block');

        $("#create_team_button").off().click(function (e) {
            addToDB();
        });

        $("#addTeamMember").off().click(function (e) {
            e.preventDefault();
            totalMem++;
            $('#other').append("Name: <br> <input type='text' name='name[]'> <br>");
            $('#other').append("Resume: <br> <input type='url' name='resume[]'><br>");
        });
    });


    $('#login').off().click(function (e) {
        var loginText = $("#login").text();
        if (loginText.includes("logout")) {
            firebase.auth().signOut().then(function () {
                $("#" + userTeam.id).css('background-color', 'transparent').css("opacity", "1");
                userTeam = null;
                $("#login").text("Log in");
                $("#add").css("display", "block");
            }, function (error) {
                console.log(error);
            });
        } else {
            $('#login_popup').css('display', 'block');
            $('#login_button').click(function (e) {
                var email = document.getElementsByName("email_login")[0].value;
                var password = document.getElementsByName("password_login")[0].value;
                firebase.auth().signInWithEmailAndPassword(email, password).then(function () {
                    user = firebase.auth().currentUser;
                    getTeamWithEmail(email, function (snapshot) {
                        userTeam = Object.values(snapshot.val())[0];
                        userTeam.id = Object.keys(snapshot.val())[0];
                        $("#" + userTeam.id).css('background-color', '#FFCB00').css("opacity", "0.5");
                        $("#login").text("logout " + email);
                        $("#add").css("display", "none");
                    });
                    div_hide();

                }, function (error) {
                    console.log(error.message);
                    $("#login_text").text("That is the incorrect email or password. Please try again.");
                });

            });
        }
    });


});

function onTimeClick(obj) {
    if (userTeam != null) {
        var id = obj.id.substr(0, obj.id.length - 1);
        var time = obj.id.charAt(obj.id.length - 1);
        var text = obj.innerHTML;
        if (text == 'Available') {
            updateToPending(id, time);
        } else if (text.includes('Pending')) {
            getTeamFromMembers(time, function (team) {
                $('#popupAccept').css('display', 'block');
                if (id == userTeam.id) {
                    var newtext = text.replace("Pending", "");
                    $('#meeting_accept').text("Would you like to accept the " + newtext + "?");
                    $("#accept_cancel").text("Yes.");
                    $('#deny').css('display', 'block');
                    $('#deny').off().click(function (e) {
                        changeStatus(userTeam, team, time, "Available");
                    });
                    $('#accept_cancel').off().click(function (e) {
                        changeStatus(userTeam, team, time, "Meeting with");
                    });
                } else {
                    $('#meeting_accept').text("Would you like to cancel the meeting with " + team.students.name.join(", ") + "?");
                    $("#accept_cancel").text("Yes, I would like to cancel.");
                    $('#deny').css('display', 'none');
                    $("#accept_cancel").off().click(function (e) {
                        changeStatus(userTeam, team, time, "Available");
                    });
                }

            });
        }
    }
}

function getTeam(id, execute) {
    database.ref('teams/' + id).once('value').then(function (snapshot) {
        execute(snapshot);
    });
}

function getTeamWithEmail(email, execute) {
    database.ref().child('teams').orderByChild('email')
        .equalTo(email).once('value').then(function (snapshot) {
        execute(snapshot);
    });

}

function getMemberPart(time, team) {
    var members = team.times[time].replace("Pending meeting with ", "");
    members = members.split(", ");
    return members;
}

function getTeamFromMembers(time, execute) {
    var members = getMemberPart(time, userTeam);
    possibleTeams = $(".names");
    possibleTeams.each(function (i) {
        if (possibleTeams[i].innerHTML.includes(members[0])) {
            var secondId = possibleTeams[i].id;
            getTeam(secondId, function (snapshot) {
                secondTeam = snapshot.val();
                secondTeam.id = secondId;
                execute(secondTeam);
            });
        }
    });
}

function updateToPending(id, time) {
    if (id != userTeam.id) {
        getTeam(id, function (snapshot) {
            team = snapshot.val();
            team.id = id;
            if (team.times[time] == "Available" && userTeam.times[time] == "Available") {
                liststudents = team.students.name.join(", ");
                var day;
                if (time >= ALL_TIMES.length) {
                    day = "Thursday";
                } else {
                    day = "Tuesday";
                }
                $('#team_contact').text("Would you like to request to set up a meeting on " + day
                    + " at " + (ALL_TIMES[time % ALL_TIMES.length]) + " with " + liststudents + "?");

                $('#popupContact #submit').off().click(function () {
                    changeStatus(userTeam, team, time, "Pending meeting with");
                });
                $('#popupContact').css('display', 'block');
            }
        });
    }

}

function changeStatus(team1, team2, time, status) {
    updateStatus(team1, team2, time, status);
    updateStatus(team2, team1, time, status);
    div_hide();
}

function updateStatus(requestingTeam, requestedTeam, time, status) {
    var students = requestingTeam.students.name.join(", ");
    var newTimes = [];
    for (i = 0; i < 10; i++) {
        if (i == time) {
            if (status == "Available") {
                newTimes[i] = status;
            } else {
                newTimes[i] = status + " " + students;
            }
        } else {
            newTimes[i] = requestedTeam.times[i];
        }
    }
    database.ref('teams/' + requestedTeam.id).set({
        email: requestedTeam.email,
        students: requestedTeam.students,
        times: newTimes
    });
}

function div_hide() {
    $('#popupContact').css('display', 'none');
    $('#popupAccept').css('display', 'none');
    $('#login_popup').css('display', 'none');
    $('#createTeam').css('display', 'none');
}

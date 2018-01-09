var config = {
    apiKey: "apiKey",
    authDomain: "appName.firebaseapp.com",
    databaseURL: "https://appName.firebaseio.com",
    storageBucket: "appName.appspot.com",
    messagingSenderId: "senderId"
};
firebase.initializeApp(config);

var database = firebase.database();
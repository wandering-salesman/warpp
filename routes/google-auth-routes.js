const express = require("express");
const router = express.Router();
const passport = require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../models/user");
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET_ID,
    callbackURL: "http://localhost:4001/auth/google/callback"
    // callbackURL: 'https://remote-pair-programming.herokuapp.com/auth/google/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    if (profile) {
      console.log(`Google OAuth: ${profile.displayName} verified`);
      let uid = profile.id+'google';
      User.findOne( {uid: uid} )
      .then( (currentUser)=> {
        //if we already have this user
        if(currentUser) {
          console.log(`Welcome back ${currentUser.name}`);  
          return done(null, currentUser);
        } 
        // create a new user
        else {
          const userData = {
            name: profile.displayName,
            img_url: profile.photos[0].value,
            uid: profile.id+'google'
          }
          User.create(userData).then( (newUser)=> {
            console.log("new user created")
          }).catch( e => console.error("cannot create user! "+e))
          return done(null, userData);
        }

      })
      
    } else {
      return done(null, false);
    }
  }
));



router.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));

router.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', successRedirect: '/'})
);

module.exports = router;
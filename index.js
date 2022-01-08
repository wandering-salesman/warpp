const express = require('express');
const socket = require('socket.io');
const http = require('http');
const passport = require('passport');
const expressSession = require('express-session')
const connectDB = require('./connectDB');
// const githubAuth = require('./routes/github-auth-routes');
const googleAuth = require('./routes/google-auth-routes');
const bodyParser = require('body-parser');
const User = require("./models/user");
const Repo = require("./models/repo");
const {c, cpp, python} = require('compile-run');
const fs = require('fs');


let app = express();
let server = http.Server(app);
let PORT = process.env.PORT || 4001;
let io = socket(server);

// Start the server-----------------------------------------------------
server.listen(PORT, ()=> {
  console.log(`server running on port ${PORT}`);
  connectDB()
  .then( ()=> console.log("DB connected successfully"))
  .catch( (e)=> console.error("Error in connecting DB "+e))
})

// Middleware functions-------------------------------------------------

// logging routes
let logger = function(req, res, next) {
	console.log(`LOGGER: method ${req.method}, url ${req.url}`);
	next();
};

let isAuth = (req, res, next)=> {
  console.log("validating authorizatiion")
  if(req.isAuthenticated()) {
    console.log("Authorised user")
    return next();
  } else {
    res.send({msg: "Not Authorized, try logging in"})
  }
}

// passport serializing and desserializing
passport.serializeUser((user, done) => {
	console.log('serializing');
	done(null, user.uid);
});

passport.deserializeUser((id, done) => {
	console.log('deserializing');
	User.findOne({ uid: id })
		.then((user) => {
      console.log(user.name)
			done(null, user);
		})
		.catch((e) => console.error('cannot get user ' + e));
});

// Use middlewares-------------------------------------------------------

app.use(express.static('public'));
app.use(logger);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// generate session
app.use(expressSession({
	secret: 'lock_sher_lock',
	resave: false,
	saveUninitialized: false
}));

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

// use auth routes
// app.use(githubAuth);
app.use(googleAuth);

// generic routes
app.get("/getUser",isAuth, (req,res)=> {
  console.log(req.user.uid);
  getUserInfo(req.user.uid)
    .then((userData) => {
      if(userData) res.json(userData.toJSON());
      else res.send({msg: "no user info found"});
    })
    .catch(e => console.error("cannot get user info "+e));
})           

app.get("/login", (req, res)=> {
  res.sendFile('./public/login.html', {root: __dirname})
})

app.get("/logout", (req, res)=> {
  const user = req.user;
	req.logout();
	console.log(user.uid+" is logged out!");
	res.redirect('/');
})

app.get("/join/:id", (req, res)=> {
  if( !req.isAuthenticated() ) {
    res.redirect('/login');  
  } else {
    Repo.findOne({repo_uid: req.params.id})
      .then( (repoData)=> {
        if(!repoData || repoData.peer_uid) {
          res.send({msg: "repo not available or max limit reached!"})
        } else if(repoData.creater_uid === req.user.uid) {
          res.redirect('/');
        } else {
          Repo.findOneAndUpdate({repo_uid: req.params.id}, { 
              peer_uid: req.user.uid, 
              peer_img: req.user.img_url,
              peer_name: req.user.name
            })
            .then( (updatedData)=> {
              User.findOneAndUpdate({uid: req.user.uid}, {active_repo_id: req.params.id})
                .then( ()=> {
                  res.redirect('/')
                })
            })
            .catch( e => console.log("Error in updating repo "+e));
        }
      }) 
    }
});

app.delete('/repo/:id', isAuth, (req, res)=> {
  let repoId = req.params.id;
  Repo.findOneAndDelete({repo_uid: repoId})
    .then( ()=> {
      res.json({isDeleted: true})
    })
    .catch( (e)=> {
      res.json({isDeleted: false});
      console.error("Error in deleting the repo! "+e);
    })
})

app.post('/repo/:id', isAuth, (req, res)=> {
  let code = req.body.code
  console.log("Saving the repo "+req.params.id+" with data "+code);
  Repo.findOneAndUpdate({repo_uid: req.params.id}, {
    code: code,
    lang: req.body.lang
  }).then( ()=> {
    User.findOneAndUpdate({uid: req.user.uid}, {
      $push: { inactive_repo_ids: req.params.id }
    }).then( ()=> {
      res.json({msg: "repo saved"});
    })
  }).catch( (e)=> {
    res.json({msg: "cannot save repo"});
    console.log("Error in updating repo "+e)
  });
})


//Compiler function.................

app.post('/compileRun' , function (req , res ) {
	let code = req.body.code,
    input = req.body.input,
    lang = req.body.lang;
    
    if(lang === "cpp") { 
      let resultPromise
      if(input.length > 0) {
        resultPromise = cpp.runSource(code, { stdin: input});  
      } else {
        resultPromise = cpp.runSource(code);
      }
      resultPromise
          .then(result => {
              res.json(result)
          })
          .catch(err => {
              res.json(err);
          });
    }
    else if(lang === "c") {
      let resultPromise
      if(input.length > 0) {
        resultPromise = c.runSource(code, { stdin: input});  
      } else {
        resultPromise = c.runSource(code);
      }
      resultPromise
          .then(result => {
              res.json(result)
          })
          .catch(err => {
              res.json(err);
          });
    }
    else if( lang === "python") {
      let resultPromise
      if(input.length > 0) {
        resultPromise = python.runSource(code, { stdin: input});  
      } else {
        resultPromise = python.runSource(code);
      }
      resultPromise
          .then(result => {
              res.json(result)
          })
          .catch(err => {
              res.json(err);
          });
    }
});

// Utilty functions
const getUserInfo = (uid)=> {
  return User.findOne({uid: uid});
}

const saveFile = (text, extension)=> {
  return new Promise( (res, rej)=> {
    let fileName = Math.random().toString(36).substr(2, 8);
    fs.writeFile(`temp/${fileName}.${extension}`, text, (err)=> {
      if(err) rej(err);
      else res();
    })
  })
}


//socket.io Logic (reading and emitting events)----------------------
require("./socketEvents")(io);
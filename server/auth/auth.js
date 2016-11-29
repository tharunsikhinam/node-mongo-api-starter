const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');

const config = require('../config/config');
const User = require('../api/user/model');

const checkToken = expressJwt({ secret: config.secrets.jwt });

module.exports = {
  decodeToken,
  getFreshUser,
  verifyUser,
  signToken,
  // getSignedInUserData
}

// Decode user's token
function decodeToken() {
  return function(req, res, next) {
    // [OPTIONAL]
    // make it optional to place token on query string
    // if it is, place it on the headers where it should be
    // so checkToken can see it. See follow the 'Bearer 034930493' format
    // so checkToken can see it and decode it
    if (req.query && req.query.hasOwnProperty('access_token')) {
      req.headers.authorization = 'Bearer ' + req.query.access_token;
    }
    // this will call next if token is valid
    // and send error if it is not. It will attached
    // the decoded token to req.user
    return checkToken(req, res, next);
  }
};

// Set req.user to the authenticated user if JWT is valid & user is found in DB,
// otherwise return error
function getFreshUser() {
  return function(req, res, next) {
    User.findById(req.user._id)
      .then(function(user) {
        if (!user) {
          // if no user is found it was not
          // it was a valid JWT but didn't decode
          // to a real user in our DB. Either the user was deleted
          // since the client got the JWT, or
          // it was a JWT from some other source
          return res.status(401).send({ error: 'Unauthorized' });
        }
        // update req.user with fresh user from
        // stale token data
        req.user = user;
        return next();
      })
      .catch(err => next(err));
  };
};

// Authenticate the user
function verifyUser() {
  return function(req, res, next) {
    const email = req.body.email;
    const password = req.body.password;

    // if no email or password then send
    if (!email || !password) {
      res.status(400).send({ error: 'You need valid email and password' });
      return;
    }

    // look user up in the DB so we can check
    // if the passwords match for the email
    User.findOne({email: email})
      .then(function(user) {
        if (!user) {
          return res.status(401).send({ error: 'No user with the given email' });
        } else {
          // checking the passowords here
          if (!user.comparePassword(password)) {
            return res.status(401).send({ error: 'Incorrect credentials' });
          }
          // if everything is good,
          // then attach to req.user
          // and call next so the controller
          // can sign a token from the req.user._id
          req.user = user;
          return next();
        }
      })
      .catch(err => next(err));
  };
};

// Sign token on signup
function signToken(id) {
  return jwt.sign(
    { _id: id },
    config.secrets.jwt,
    { expiresIn: config.expireTime }
  )
};


// (OPTIONAL)
// function getSignedInUserData() {
//   return function(req, res, next) {
//     User.findById(req.user._id)
//       .then(function(user) {
//         if (!user) {
//           // if no user is found, but
//           // it was a valid JWT but didn't decode
//           // to a real user in our DB. Either the user was deleted
//           // since the client got the JWT, or
//           // it was a JWT from some other source
//           return res.status(401).send('Unauthorized');
//         }
//         // update req.user with fresh user from
//         // stale token data
//         return res.json({
//           username: user.username,
//           firstName: user.firstName,
//           lastName: user.lastName,
//           email: user.email
//         });
//       })
//       .catch(err => next(err));
//   };
// };
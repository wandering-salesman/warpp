require("dotenv").config();
const mongoose = require("mongoose");
const DBurl = process.env.MONGO_REMOTE_URL;

const connect = () => {
  return mongoose.connect(DBurl, (err) => {
    if (err) throw err;
    console.log("connected to MongoDB");
  }, {useNewUrlParser: true});
};

module.exports = connect;

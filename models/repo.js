const mongoose = require('mongoose');

let repo_schema = mongoose.Schema({
    repo_uid: String,
    creater_uid: String,
    creater_name: String,
    creater_img: String,
    peer_uid: String,
    peer_name: String,
    peer_img: String,
    code: String,
    lang: String,
    status: String
});

let Repo = mongoose.model('repos', repo_schema);
module.exports = Repo;
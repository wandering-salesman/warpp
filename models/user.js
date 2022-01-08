const mongoose = require('mongoose');

let user_schema = mongoose.Schema({
    uid: String,
    pair_id: String,
    socket_id: String,
    name: String,
    email: String,
    active_repo_id: String,
    img_url: String,
    inactive_repo_ids: [
        {
            type: String
        }
    ]
});

let User = mongoose.model('users', user_schema);
module.exports = User;
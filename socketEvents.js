const Repo = require("./models/repo");
const User = require("./models/user");

module.exports = function (io) {
  io.on("connection", function (socket) {
    console.log("socket connected");

    socket.on("typing", function (data) {
      //recieving code, line & repo_id, ch
      console.log(
        `Broadcasting from sid: ${socket.id} sender_uid: ${data.uid} to repo: ${data.repo_id}`
      );
      const typeData = {
        code: data.code,
        line: data.line,
        ch: data.ch,
      };
      socket.broadcast.to(data.repo_id).emit("typing", typeData);
    });

    socket.on("createRepo", (data) => {
      //recieving repo_id & c_uid
      socket.join(data.repo_id);
      User.findOneAndUpdate(
        { uid: data.c_uid },
        {
          active_repo_id: data.repo_id,
          socket_id: socket.id,
        }
      ).exec();
      console.log("creating room for " + data.c_uid);
      const newRepo = {
        repo_uid: data.repo_id,
        creater_uid: data.c_uid,
        creater_img: data.c_img,
        creater_name: data.c_name,
      };
      Repo.create(newRepo)
        .then(() => console.log("New repo created"))
        .catch((e) => console.error("Error in creating new repo " + e));
    });

    socket.on("joinRepo", (data) => {
      //recieving uid and repo_id
      console.log(
        `sid: ${socket.id}, uid: ${data.uid} is joining ${data.repo_id}`
      );
      socket.join(data.repo_id);
      //inform the "other" that "this one" has joined, with img_url, name
      Repo.findOne({ repo_uid: data.repo_id }).then((repoData) => {
        broadcastToAll(repoData);
      });
      //update socket id
      User.findOneAndUpdate({ uid: data.uid }, { socket_id: socket.id }).exec();
    });

    socket.on("message", (data) => {
      console.log("sending message: " + data.msg + " to repo: " + data.rid);
      socket.broadcast.to(data.rid).emit("message", data.msg);
    });

    socket.on("video-signal", (data) => {
      //recieving video_id, repo_id
      console.log("recieved the video signal.........");
      socket.broadcast.to(data.repo_id).emit("video-signal", data.video_id);
    });

    socket.on("disconnect", () => {
      console.log("a socket disconnected");
      User.findOne({ socket_id: socket.id })
        .then((UserData) => {
          socket.broadcast.to(UserData.active_repo_id).emit("userLeft", {
            name: UserData.name,
          });
        })
        .catch((e) => console.log("cannot emit leftRepo " + e));

      User.findOneAndUpdate(
        { socket_id: socket.id },
        { $unset: { socket_id: "", active_repo_id: "" } }
      )
        .then(() => console.log("socket removed successfully"))
        .catch((e) => console.log("Cannot find and update user " + e));
    });
  });

  const broadcastToAll = (repoData) => {
    io.in(repoData.repo_uid).emit("joined", {
      creater_name: repoData.creater_name,
      creater_img: repoData.creater_img,
      peer_name: repoData.peer_name,
      peer_img: repoData.peer_img,
    });
  };
};

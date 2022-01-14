// const gurl = final deployed url
const gurl = "localhost:4001";
const socketForClient = io.connect(gurl, function (data, err) {
  if (err) console.log(err);
  console.log(data);
});

//DOM Query-------------------------------------------------------
let g_link = document.getElementsByClassName("g-link")[0];
let share_link = document.getElementById("share-link");
let copy_btn = document.getElementsByClassName("input-group-prepend")[0];
let myTextArea = document.getElementById("code");
let login_btn = document.getElementsByClassName("login-btn")[0];
let profile_img = document.getElementsByClassName("profile-img")[0];
let save_repo_btn = document.getElementById("save-repo");
let delete_repo_btn = document.getElementById("delete-repo");
let peer_img_container = document.getElementById("navbarMarkup");
let lang_option = document.getElementById("lang-option");
let text_msg = document.getElementById("text-msg");
let send_btn = document.getElementsByClassName("paper-plane-icon")[0];
let chat_content = document.getElementById("chat-content");
let chat_content_inner = document.getElementById("chat-content-inner");
let video_init = document.getElementById("video-init");
let video_connect = document.getElementById("video-connect");
let peer_video = document.getElementById("peer-video");
let video_call_progress = document.getElementsByClassName(
  "video-call-progress"
)[0];
let call_status = document.getElementById("call-status");
let compile_run_btn = document.getElementById("compile-run");
let code_input = document.getElementById("code-input");
let code_output = document.getElementById("code-output");
let load_icon = document.getElementsByClassName("load-icon")[0];
let nav_chat_tab = document.getElementById("nav-chat-tab");
let nav_avchat_tab = document.getElementById("nav-avchat-tab");
let video_disonnect = document.getElementById("video-disconnect");

//Code mirror setup-----------------------------------------------1
let myCodeMirror = CodeMirror.fromTextArea(myTextArea, {
  lineNumbers: true,
  theme: "monokai",
  scrollbarStyle: "null",
});

CodeMirror.on(myCodeMirror, "keyup", (instance, obj) => {
  if (sessionStorage.getItem("rid")) {
    let code = instance.doc.getValue();
    const data = {
      code: code,
      line: instance.doc.getCursor().line,
      ch: instance.doc.getCursor().ch,
      repo_id: sessionStorage.getItem("rid"),
      uid: sessionStorage.getItem("uid"),
    };
    socketForClient.emit("typing", data); //=================
    console.log("send the code for repo: " + data.repo_id);
  }
});

lang_option.addEventListener("change", (e) => {
  console.log("language switched to: " + e.target.value);
  language = e.target.value;
  if (language == "c") {
    myCodeMirror.setOption("mode", "text/x-csrc");
  } else if (language == "cpp") {
    myCodeMirror.setOption("mode", "text/x-c++src");
  } else {
    myCodeMirror.setOption("mode", language);
  }
});

//Socket data recieving from server------------------------------------

socketForClient.on("joined", (data) => {
  if (data.peer_img != profile_img.src) {
    addPeerImage(data.peer_name, data.peer_img);
  } else {
    addPeerImage(data.creater_name, data.creater_img);
  }
});

socketForClient.on("typing", function (data) {
  console.log("recieving data");
  myCodeMirror.setValue(data.code);
  console.log("Block line: ------------" + data.line);
  myCodeMirror.markText(
    { line: data.line, ch: 1 },
    { line: data.line, ch: data.ch },
    { readOnly: true }
  );
});

socketForClient.on("userLeft", (data) => {
  alert(`${data.name} has left the repo!`);
});

socketForClient.on("customError", (data) => {
  if (data.err === 101) {
    alert("This shared repo is already full");
    setTimeout(function () {
      sessionStorage.clear();
      window.location.href = "/";
    }, 500);
  }
});

socketForClient.on("message", (data) => {
  console.log("recieved a message: " + data);
  if (!nav_chat_tab.children[1] && !nav_chat_tab.classList.contains("active"))
    toggleNotification(nav_chat_tab, true);
  addChatToDOM(false, data);
});

socketForClient.on("video-signal", (data) => {
  console.log("recieved video-id of peer: ");
  if (
    !nav_avchat_tab.children[1] &&
    !nav_avchat_tab.classList.contains("active")
  )
    toggleNotification(nav_avchat_tab, true);
  sessionStorage.setItem("peer-video-id", data);
  //if it is NOT creator
  let boolValue = sessionStorage.getItem("isCreator");
  if (boolValue == "false") {
    video_call_progress.classList.replace("hide", "show");
    call_status.innerHTML = "Incoming call..(click Answer & then connect)";
  } else {
    call_status.innerHTML = "Call accepted..(click connect)";
  }
});

//Simple-peer(video call) configurations-------------------------------

//initiate
video_init.addEventListener("click", () => {
  //display call progress
  video_call_progress.classList.replace("hide", "show");

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      console.log("inside callback function");
      let boolValue = sessionStorage.getItem("isCreator");
      let peer = new SimplePeer({
        initiator: boolValue == "true" ? true : false,
        trickle: false,
        stream: stream,
      });
      peer.on("signal", (data) => {
        sessionStorage.setItem("my-video-id", JSON.stringify(data));
        socketForClient.emit("video-signal", {
          //====================
          video_id: JSON.stringify(data),
          repo_id: sessionStorage.getItem("rid"),
        });
      });

      peer.on("stream", (stream) => {
        video_call_progress.classList.replace("show", "hide");
        console.log("stream recieved " + stream);
        peer_video.srcObject = stream;
        peer_video.play();
      });

      peer.on("close", () => {
        peer.destroy();
        video_disonnect.classList.replace("show", "hide");
        sessionStorage.removeItem("my-video-id");
        sessionStorage.removeItem("peer-video-id");
      });

      video_connect.addEventListener("click", () => {
        let peerUID = sessionStorage.getItem("peer-video-id");
        peer.signal(JSON.parse(peerUID));
        video_disonnect.classList.replace("hide", "show");
      });

      video_disonnect.addEventListener("click", () => {
        peer.destroy();
        video_disonnect.classList.replace("show", "hide");
        sessionStorage.removeItem("my-video-id");
        sessionStorage.removeItem("peer-video-id");
      });
    })
    .catch((error) => {
      console.error("Error in accessing video/audio: " + error);
    });
});

//Other functions ----------------------------------------------------

const addPeerImage = (name, url) => {
  let image = document.createElement("img");
  image.classList.add("profile-img");
  image.setAttribute("title", name);
  let downloadingImage = new Image();
  downloadingImage.onload = function () {
    image.src = this.src;
  };
  downloadingImage.src = url;

  let img_container = document.createElement("div");
  img_container.classList.add("profile-img-container");
  img_container.appendChild(image);
  setTimeout(() => {
    peer_img_container.appendChild(img_container);
  }, 1000);
};

const addChatToDOM = (self, text) => {
  let time = new Date();
  let element = `
    <div class="media media-chat ${self ? "media-chat-reverse" : ""}">
        <div class="media-body">
            <p>${text}</p>
            <p class="meta"><time>${time.getHours()}:${time.getMinutes()}</time></p>
        </div>
    </div>`;
  chat_content_inner.insertAdjacentHTML("beforeend", element);
  console.log("dom added");
  chat_content.scrollTo(0, chat_content_inner.scrollHeight);
};

const sendTheMessage = () => {
  let msg = text_msg.value;
  if (msg.length > 0 && sessionStorage.getItem("rid")) {
    console.log("sending " + msg + " to " + sessionStorage.getItem("rid"));
    const msgData = {
      msg: msg,
      rid: sessionStorage.getItem("rid"),
    };
    socketForClient.emit("message", msgData); //=======================
    addChatToDOM(true, msg);
    text_msg.value = "";
  }
};

const toggleNotification = (element, add) => {
  if (add) {
    element.insertAdjacentHTML(
      "beforeend",
      "<span class='badge badge-warning'>!</span>"
    );
  } else {
    element.children[1].remove();
  }
};

//Event listeners--------------------------------------------------

// Onload: fetch user information from server
window.onload = () => {
  console.log("DOM loaded, now fetching user details");
  sessionStorage.clear();
  g_link.disabled = true;
  save_repo_btn.disabled = true;
  delete_repo_btn.disabled = true;
  fetch("/getUser")
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(JSON.stringify(data));
      let userData = JSON.parse(JSON.stringify(data));
      if (userData.name) {
        login_btn.innerHTML = "Logout";
        login_btn.setAttribute("href", "/logout");
        g_link.disabled = false;
        save_repo_btn.disabled = false;
        delete_repo_btn.disabled = false;
        profile_img.setAttribute("src", data.img_url);
        profile_img.setAttribute("title", data.name);
        sessionStorage.setItem("uid", data.uid);
        if (userData.active_repo_id) {
          g_link.disabled = true;
          delete_repo_btn.disabled = true;
          sessionStorage.setItem("rid", userData.active_repo_id);
          sessionStorage.setItem("isCreator", "false");
          socketForClient.emit("joinRepo", {
            //======================
            repo_id: sessionStorage.getItem("rid"),
            uid: sessionStorage.getItem("uid"),
            img_url: data.img_url,
            name: data.name,
          });
        }
      } else {
        console.log("Cannot get user info! try logging in");
      }
    });
};

g_link.addEventListener("click", (e) => {
  e.preventDefault();
  console.log("generating unique link");
  //create room and register data in DB/json file
  let repoId = Math.random().toString(36).substr(2, 5);
  let c_repo_data = {
    repo_id: repoId,
    c_uid: sessionStorage.getItem("uid"),
    c_img: profile_img.src,
    c_name: profile_img.title,
  };
  socketForClient.emit("createRepo", c_repo_data); //================
  share_link.value = "localhost:4001/join/" + repoId;
  sessionStorage.setItem("rid", repoId);
  g_link.disabled = true;
  video_init.innerHTML = "Dial";
  sessionStorage.setItem("isCreator", "true");
});

copy_btn.addEventListener("click", () => {
  share_link.focus();
  share_link.select();
  try {
    document.execCommand("copy");
  } catch (err) {
    alert("Oops, unable to copy! please update your browser");
  }
});

delete_repo_btn.addEventListener("click", () => {
  fetch(`repo/${sessionStorage.getItem("rid")}`, {
    method: "delete",
  })
    .then((response) => {
      return response.json();
    })
    .then((result) => {
      let resultObj = JSON.parse(JSON.stringify(result));
      if (resultObj.isDeleted) {
        console.log("repo deleted successfully");
        share_link.value = "";
        sessionStorage.removeItem("rid");
        alert("Repo deleted successfully");
        window.location.href = "/";
        g_link.disabled = false;
      } else {
        console.log("Error encountered in deleting repo!");
      }
    });
});

save_repo_btn.addEventListener("click", () => {
  const codeData = {
    code: myCodeMirror.getValue(),
    lang: lang_option.value,
    //second field lang
  };
  console.log("saving code " + codeData);
  fetch(`repo/${sessionStorage.getItem("rid")}`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(codeData),
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      alert(JSON.stringify(data));
    });
});

send_btn.addEventListener("click", () => {
  sendTheMessage();
});

text_msg.addEventListener("keydown", (e) => {
  if (e.keyCode === 13) {
    sendTheMessage();
  }
});

compile_run_btn.addEventListener("click", () => {
  //change UI to loading...
  compile_run_btn.disabled = true;
  load_icon.classList.remove("hide");
  //grab code, lang & input
  let codeData = {
    code: myCodeMirror.getValue(),
    lang: lang_option.value,
    input: code_input.value,
  };
  console.log("sending code to comiple-run");
  fetch("/compileRun", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(codeData),
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      // let the_output = JSON.parse(JSON.stringify(data));
      // console.log(the_output);
      // code_output.value =  the_output.output;
      let compile_result = JSON.parse(JSON.stringify(data));
      console.log(compile_result);
      if (compile_result.stderr.length > 0) {
        code_output.value = compile_result.stderr;
      } else {
        code_output.value = compile_result.stdout;
      }
      if (compile_result.errorType) {
        code_output.value =
          code_output.value + "\nError: " + compile_result.errorType;
      }
      setTimeout(() => {
        compile_run_btn.disabled = false;
      }, 2000);
      load_icon.classList.add("hide");
    })
    .catch((err) => {
      console.log("error in fetching compile result " + err);
      load_icon.classList.add("hide");
    });
});

nav_chat_tab.addEventListener("click", () => {
  if (nav_chat_tab.children[1]) toggleNotification(nav_chat_tab, false);
});

nav_avchat_tab.addEventListener("click", () => {
  if (nav_avchat_tab.children[1]) toggleNotification(nav_avchat_tab, false);
});

window.onbeforeunload = (event) => {
  if (sessionStorage.getItem("rid")) {
    return "You have unsaved changes! Do you confirm to reload?";
  } else {
    return undefined;
  }
};

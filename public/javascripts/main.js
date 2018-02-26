
var vid = document.getElementById('inputVideo');
var vid_width = vid.width;
var vid_height = vid.height;
var overlay = document.getElementById('overlay');
var overlayCC = overlay.getContext('2d');

var running = false;

/*********** Setup of video/webcam and checking for webGL support *********/

function enablestart() {
    var startbutton = document.getElementById('startbutton');
    startbutton.value = "start";
    startbutton.disabled = null;
}

var insertAltVideo = function(video) {
    // insert alternate video if getUserMedia not available
    if (supports_video()) {
        if (supports_webm_video()) {
            video.src = "./media/cap12_edit.webm";
        } else if (supports_h264_baseline_video()) {
            video.src = "./media/cap12_edit.mp4";
        } else {
            return false;
        }
        return true;
    } else return false;
}

function adjustVideoProportions() {
    // resize overlay and video if proportions of video are not 4:3
    // keep same height, just change width
    var proportion = vid.videoWidth/vid.videoHeight;
    vid_width = Math.round(vid_height * proportion);
    vid.width = vid_width;
    overlay.width = vid_width;
}

function gumSuccess( stream ) {
    // add camera stream if getUserMedia succeeded
    if ("srcObject" in vid) {
        vid.srcObject = stream;
    } else {
        vid.src = (window.URL && window.URL.createObjectURL(stream));
    }
    vid.onloadedmetadata = function() {
        adjustVideoProportions();
        vid.play();
    }
    vid.onresize = function() {
        adjustVideoProportions();
        if (trackingStarted) {
            ctrack.stop();
            ctrack.reset();
            ctrack.start(vid);
        }
    }
}

function gumFail() {
    // fall back to video if getUserMedia failed
    insertAltVideo(vid);
    document.getElementById('gum').className = "hide";
    document.getElementById('nogum').className = "nohide";
    alert("There was some problem trying to fetch video from your webcam, using a fallback video instead.");
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL || window.msURL || window.mozURL;

// set up video
if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia({video : true}).then(gumSuccess).catch(gumFail);
} else if (navigator.getUserMedia) {
    navigator.getUserMedia({video : true}, gumSuccess, gumFail);
} else {
    insertAltVideo(vid);
    document.getElementById('gum').className = "hide";
    document.getElementById('nogum').className = "nohide";
    alert("Your browser does not seem to support getUserMedia, using a fallback video instead.");
}

vid.addEventListener('canplay', enablestart, false);

/*********** Code for face tracking *********/

var ctrack = new clm.tracker();
ctrack.init();
var trackingStarted = false;

function startVideo() {
    running = true;
    // start video
    vid.play();
    // start tracking
    ctrack.start(vid);
    trackingStarted = true;
    // start loop to draw face
    drawLoop();
}

function stopVideo() {
    running = false;
    // vid.pause();
    // stop tracking
    ctrack.stop();
    overlayCC.clearRect(0, 0, vid_width, vid_height);
    trackingStarted = false;
}

function drawLoop() {
    if (running) {
        requestAnimationFrame(drawLoop);
        overlayCC.clearRect(0, 0, vid_width, vid_height);
        //psrElement.innerHTML = "score :" + ctrack.getScore().toFixed(4);
        var position = ctrack.getCurrentPosition();
        if (position) {
            ctrack.draw(overlay);
            // var nose = position[62];
            // var leftEye = position[27];
            // var rightEye = position[32];
            // console.log('LeftEye: ' + leftEye + ' RightEye: ' + rightEye + ' Nose: '+ nose);
        }
        buildEvent(position, new Date().getTime());
        // console.log("Has Position: " + hasPosition);
    }
}

var soundFile = '/sounds/alarm.mp3';
var userId = 'f5ea3ec6-1f66-4c46-a788-14ff7fe0d81a'; //Danica Patric
var contactId = '48889fb9-fbc5-42a9-8f04-7898138a1e53'; //Her Mom
var stateTimeout = 1000;
var event = { state:false, time: new Date().getTime() };
function buildEvent(position, timestamp) {
    var hasPosition = !!position;
    if (hasPosition) {
        // console.log("Updating Event position");
        event.leftEye = position[27];
        event.rightEye = position[32];
        event.nose = position[62];
    }

    if ((timestamp - event.time) > stateTimeout && hasPosition != event.state) {
            event.state = hasPosition;
            var quadrant = '';
            if (event.nose[0] > 600) {
                quadrant+='Left';
            } else {
                quadrant+='Right';
            }
            quadrant += '/';
            if (event.nose[1] < 300) {
                quadrant+='Top';
            } else {
                quadrant+='Bottom';
            }
            event.quadrant = quadrant;
            console.log("New Event!");
            console.log(event);
            sendEvent(event);
    }
    else if (hasPosition == event.state) {
        // console.log("Updateing Timestamp");
        event.time = timestamp;
    }
}

function sendEvent(event) {
    var eventDisplay = document.createElement('div');
    eventDisplay.style = 'position:relative; left: 10px; height: 25px;';
    
    var image = document.createElement('img');
    image.setAttribute('class', 'check');
    image.style = 'hieght: 20px;';
    
    var textDiv = document.createElement('div');
    textDiv.setAttribute('class', 'text');
    var stamp = new Date(event.time);
    var textTime = `${stamp.getHours()}:${stamp.getMinutes()}:${stamp.getSeconds()}.${stamp.getMilliseconds()}`
    // eventDisplay.innerText = "User Focused: " + event.state + ", Time: "+ textTime;
    
    textDiv.innerText = "User Focused: " + event.state + ", Time: "+ textTime;
    if (event.state) {
        image.src = '/images/check-yes-s.png';
        // eventDisplay.setAttribute('class', 'green');
    } else {
        var audio = new Audio(soundFile);
        audio.play();
        image.src = '/images/error.jpg';
        // eventDisplay.setAttribute('class', 'red');
    }

    eventDisplay.appendChild(image);
    eventDisplay.appendChild(textDiv);
    $('#eventStream').append(eventDisplay);

    var eventForSend = {
        "userId": userId,
        "contactId": contactId,
        "at": new Date(event.time).toISOString(),
        "threshold": !event.state,
        "quadrant": event.quadrant
    };

    // console.log("Posting Event: ", eventForSend);
    // $.ajaxSetup({ cache: false });
    $.ajax({
        type: "POST",
        url: "/",
        data: eventForSend,
        success: function(s) { console.log(s) },
        dataType: "text"
      });
    // $.post("/", eventForSend, function(success) {
    //     console.log(success);
    // }, "json");
}


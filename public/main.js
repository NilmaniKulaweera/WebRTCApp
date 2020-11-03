let divSelectRoom = document.getElementById("selectRoom");
let divConsultingRoom = document.getElementById("consultingRoom");
let inputRoomNumber = document.getElementById("roomNumber");
let btnGoRoom = document.getElementById("goRoom");
let localVideo = document.getElementById("localVideo");
let remoteVideo = document.getElementById("remoteVideo");

let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller  // isCaller - helper variable to define who is making the call

const iceServers = {
    'iceServer': [
        {'urls': 'stun:stun.services.mozilla.com'}, // stun servers provided by google and mozilla
        {'urls': 'stun:stun.l.google.com:19302'}
    ]
}

// stream constraints that will be applied to video and audio streams
const streamConstraints = {
    audio: true,
    video: true
}

const socket = io();

btnGoRoom.onclick = () => {
    if (inputRoomNumber.value === '') {
        alert ("please type a room name");
    } else {
        roomNumber = inputRoomNumber.value;
        socket.emit('create or join', roomNumber);
        divSelectRoom.style = "display: none";
        divConsultingRoom.style = "display: block";
    }
}


// handler for receiving the response of the server
socket.on('created', room => {
    navigator.mediaDevices.getUserMedia (streamConstraints) // getUserMedia will return a promise
    .then (stream => {
        localStream = stream;
        localVideo.srcObject = stream;
        isCaller = true;
    })
    .catch (err => {
        console.log('An error ocurred', err);
    })
})


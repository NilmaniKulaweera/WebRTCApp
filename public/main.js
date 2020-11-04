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
        socket.emit('create or join', roomNumber); // sends a create or join message to the signalling server 
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
});

socket.on('joined', room => {
    navigator.mediaDevices.getUserMedia (streamConstraints) // getUserMedia will return a promise
    .then (stream => {
        localStream = stream;
        localVideo.srcObject = stream;
        socket.emit('ready', roomNumber); // notify the server that we are ready, and the server will in turn notify the other users
    })
    .catch (err => {
        console.log('An error ocurred', err);
    })
});

// second user has joined the call and has notified the signalling server that it's ready to begin with the offer and answer process
socket.on('ready', () => {
    if (isCaller) { // makesure the person receiving this event is the caller
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.ontrack = onAddStream;
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream); // add the stream of media devices to our peer connection (audio and video tracks)
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream); 
        rtcPeerConnection.createOffer()
            .then(sessionDescription => { // session description will have all the information about codecs, etc
                console.log('sending offer', sessionDescription);
                rtcPeerConnection.setLocalDescription(sessionDescription); // add session description to our rtc peer connection
                socket.emit('offer', { // send the offer to the signalling server so that it can be sent to other users
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomNumber
                });
            })
            .catch (err => {
                console.log(err);
            })
    }
});

// handler for the offer message other user will receive
socket.on('offer', (event) => {
    if (!isCaller) { 
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        rtcPeerConnection.onicecandidate = onIceCandidate; // whenever an ice candidate is found this event is triggered
        rtcPeerConnection.ontrack = onAddStream; // any time rtcPeerCoonection reveives a remote stream it will trigger this event
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream); // add the stream of media devices to our peer connection (audio and video tracks)
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream); 
        console.log('received offer', event);
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                console.log('sending answer', sessionDescription);
                rtcPeerConnection.setLocalDescription(sessionDescription); 
                socket.emit('answer', { 
                    type: 'answer',
                    sdp: sessionDescription,
                    room: roomNumber
                });
            })
            .catch (err => {
                console.log(err);
            })
    }
});

// asnwer message handler
socket.on('answer', (event) => {
    console.log('received answer', event);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

// candidate received from the other peer
socket.on('candidate', event => {
    const candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    console.log('received candidate', candidate);
    rtcPeerConnection.addIceCandidate(candidate);
});

// adding the remote stream we have received to our remote video element
function onAddStream(event) {
    remoteVideo.srcObject = event.streams[0];
    remoteStream = event.streams[0];
}

function onIceCandidate(event) {
    if(event.candidate) { // check if there actually is a candidate
        console.log('sending ice candidate', event.candidate);
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex, // values handles internally by the ice framework
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}


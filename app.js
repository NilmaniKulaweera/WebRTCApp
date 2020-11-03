const express = require('express');
const app = express();
let http = require('http').Server(app);

const port = process.env.PORT || 3000;

let io = require('socket.io')(http); // set the http listener

app.use(express.static('public')); // configure static hosting for the public folder

http.listen(port, () => {
    console.log('listening on', port);
});

// connect to the io library
io.on('connection', socket => {
    console.log('a user connected');

    // create our listeners
    socket.on('create or join', room => {
        console.log('create or join to room', room);
        const myRoom = io.sockets.adapter.rooms[room] || {length: 0}; // if the room is not existing
        const numClients = myRoom.length;
        console.log(room, 'has', numClients, 'clients');

        // if room does not exist
        if (numClients == 0) {
            socket.join(room); // create a room by simply joining to it
            socket.emit('created', room); // send the created user that the room is created
        } else if (numClients == 1) {
            socket.join(room);
            socket.emit('joined', room);
        } else {
            socket.emit('full', room);
        }
    });

    socket.on('ready', room => {
        socket.broadcast.to(room).emit('ready'); // broadcast to all the users in the room
    });

    socket.on('candidate', event => {
        socket.broadcast.to(event.room).emit('candidate', event);
    });

    socket.on('offer', event => {
        socket.broadcast.to(event.room).emit('offer', event.sdp);
    });

    socket.on('answer', event => {
        socket.broadcast.to(event.room).emit('answer', event.sdp);
    });
})


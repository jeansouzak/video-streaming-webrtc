const credentials = require('./credentials');
const express = require('express');
const app = express();
let broadcaster;
let server;
let port;
if (credentials.key && credentials.cert) {
  const https = require('https');
  server = https.createServer(credentials, app);
  port = 443;
} else {
  const http = require('http');
  server = http.createServer(app);
  port = 5000;
}
const io = require('socket.io')(server);
app.use(express.static(__dirname + '/public'));
io.sockets.on('error', e => console.log(e));
io.sockets.on('connection', function (socket) {
  socket.on('streamer', function () {
    //Emite para todos os clients ouvintes (broadcast) q ele está disponivel  
    socket.broadcast.emit('streamer', socket.id);
  });
  socket.on('client', function () {
    //Emite para todos os streamers ouvintes (broadcast) q ele está disponivel  
    socket.broadcast.emit('client', socket.id);
  });
  socket.on('watcher', function (who /* id do observado */) {
    //Emite para o observado (who) que ele tem um novo observador (socket.id)
    who && socket.to(who).emit('watcher', socket.id);
  });
  socket.on('offer', function (id /* id do observador */, message /* SDP */) {
    //Emite para o observador (id) o SDP com o conteudo a ser trafegado
    socket.to(id).emit('offer', socket.id /* id do observado */, message);
  });
  socket.on('answer', function (id /* id do observado */, message) {
    socket.to(id).emit('answer', socket.id /* id do observador */, message);
  });
  socket.on('candidate', function (id /* id do observador */, message) {
    //Emite para o observador (id) os caminhos para transmissão de dados (ice)
    socket.to(id).emit('candidate', socket.id /* id do observado */, message);
  });
  socket.on('watcher-candidate', function (id /* id do observado */, message) {
    //Emite para o observado (id) os caminhos para transmissão de dados (ice)
    socket.to(id).emit('watcher-candidate', socket.id /* id do observador */, message);
  });
  socket.on('disconnect', function () {
    broadcaster && socket.to(broadcaster).emit('bye', socket.id);
  });
});
server.listen(port, () => console.log(`Server is running on port ${port}`));

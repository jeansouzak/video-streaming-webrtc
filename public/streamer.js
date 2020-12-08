const peerConnections = {};
let peerConnection;
let clients = [];

/** @type {MediaStreamConstraints} */
const constraints = {
	audio: true,
	video: true
};

navigator.mediaDevices.getUserMedia(constraints)
	.then(function (stream) {
		videoHost.srcObject = stream;
		//Após preparar a midia de audio e video ele emite um sinal dizendo q o "streamer esta disponivel"
		socket.emit('streamer');
	}).catch(error => console.error(error));

//Recebe um sinal que algúem (ID) quer observa-lo (observador) (66)
socket.on('watcher', function (id) {
	const peerConnection = new RTCPeerConnection(config);
	peerConnections[id] = peerConnection;
	//Pega seu conteudo (stream audio e video)
	let stream = videoHost.srcObject;
	stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
	//Cria uma oferta preparando o session local descriptor com o conteudo pego acima
	peerConnection.createOffer()
		.then(sdp => peerConnection.setLocalDescription(sdp))
		.then(function () {
			//Se oferece (oferta) para quem quer observa-lo (observador) (id)
			socket.emit('offer', id, peerConnection.localDescription);
		});
	//Quando recebe uma ICE candidate (caminhos de rede disponivel para troca de dados ofertados)
	peerConnection.onicecandidate = function (event) {
		if (event.candidate) {
			//Emite para quem quer observa-lo (observador) o caminho candidato
			socket.emit('candidate', id, event.candidate);
		}
	};
});

//Ao receber a resposta de quem quer observa-lo (observador) (id)
socket.on('answer', function (id, description) {
	//Seta o SDP do observador em questão 
	peerConnections[id].setRemoteDescription(description);
});

//Ao receber uma ice candidate do observador (id)
socket.on('watcher-candidate', function (id, candidate) {
	//Seta o ICE candidate do observador em questão 
	peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});


socket.on('candidate', function (id, candidate) {
	peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
		.catch(e => console.error(e));
});


socket.on('offer', function (id, description) {
	peerConnection = new RTCPeerConnection(config);
	peerConnection.setRemoteDescription(description)
		.then(() => peerConnection.createAnswer())
		.then(sdp => peerConnection.setLocalDescription(sdp))
		.then(function () {
			socket.emit('answer', id, peerConnection.localDescription);
		});
	peerConnection.ontrack = function (event) {
		videoConvidado.srcObject = event.streams[0];
		videoConvidado.play();
	};
	peerConnection.onicecandidate = function (event) {
		if (event.candidate) {
			socket.emit('watcher-candidate', id, event.candidate);
		}
	};
});



socket.on('client', function (clientID) {
	if (!clients.includes(clientID)) {
		clients.push(clientID);
		socket.emit('watcher', clientID);
		socket.emit('streamer');
	}
});

socket.on('bye', function (id) {
	peerConnections[id] && peerConnections[id].close();
	delete peerConnections[id];
	delete clients[id];
});

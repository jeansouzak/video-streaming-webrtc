/*global socket, video, config*/
const peerConnections = {};
let peerConnection;
let streamers = [];

/** @type {MediaStreamConstraints} */
const constraints = {
	audio: true,
	video: true
};

navigator.mediaDevices.getUserMedia(constraints)
	.then(function (stream) {
		videoHost.srcObject = stream;
		//Após preparar a midia de audio e video ele emite um sinal dizendo q o "client esta disponivel"
		socket.emit('client');
	}).catch(error => console.error(error));


socket.on('answer', function (id, description) {
	peerConnections[id].setRemoteDescription(description);
});

socket.on('watcher', function (id) {
	const peerConnection = new RTCPeerConnection(config);
	peerConnections[id] = peerConnection;
	let stream = videoHost.srcObject;
	stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
	peerConnection.createOffer()
		.then(sdp => peerConnection.setLocalDescription(sdp))
		.then(function () {
			socket.emit('offer', id, peerConnection.localDescription);
		});
	peerConnection.onicecandidate = function (event) {
		if (event.candidate) {
			socket.emit('candidate', id, event.candidate);
		}
	};
});

socket.on('watcher-candidate', function (id, candidate) {
	peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('candidate', function (id, candidate) {
	//Adiciona o caminho (ICE) recebido do observado para transmissão dos dados
	peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
		.catch(e => console.error(e));
});

//Recebe o sinal da oferta de transmissão do observado (id)
socket.on('offer', function (id, description) {
	peerConnection = new RTCPeerConnection(config);
	//Seta os dados remoto de conexão com o SDP recebido
	peerConnection.setRemoteDescription(description)
		//Cria a resposta
		.then(() => peerConnection.createAnswer())
		//Cria o SDP local com os dados da resposta
		.then(sdp => peerConnection.setLocalDescription(sdp))
		.then(function () {
			//Emite uma resposta para o observado com o SDP local
			socket.emit('answer', id, peerConnection.localDescription);
		});
	//Faz o track para receber streams do observado 
	peerConnection.ontrack = function (event) {
		//Quando tiver trackeado seta no player html o conteudo (stream) que fica recebendo
		videoConvidado.srcObject = event.streams[0];
		videoConvidado.play();
	};
	//Quando recebe uma ICE candidate (caminhos de rede disponivel para troca de dados ofertados)
	peerConnection.onicecandidate = function (event) {
		if (event.candidate) {
			//Emite para o observador um caminho candidato para troca dos dados
			socket.emit('watcher-candidate', id, event.candidate);
		}
	};
});



socket.on('streamer', function (streamerID) {
	if (!streamers.includes(streamerID)) {
		//Incrementa sua lista de streamers
		streamers.push(streamerID);
		//Emite um sinal informando que quer ser um observador do streamer recebido
		socket.emit('watcher', streamerID);
		//Emite seu sinal de client disponivel
		socket.emit('client');
	}
});

socket.on('bye', function (id) {
	peerConnections[id] && peerConnections[id].close();
	delete peerConnections[id];
	delete streamers[id];
});

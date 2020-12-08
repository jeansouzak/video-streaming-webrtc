/*global io*/
/** @type {RTCConfiguration} */
const config = { // eslint-disable-line no-unused-vars
  'iceServers': [{
    'urls': ['stun:stun.l.google.com:19302']
  }]
};

const socket = io.connect(window.location.origin);
const videoHost = document.getElementById('video-host'); // eslint-disable-line no-unused-vars
const videoConvidado = document.getElementById('video-convidado');

window.onunload = window.onbeforeunload = function() {
	socket.close();
};


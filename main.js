// >>>> Utilities
const log = async function(msg) {
    document.getElementById('log').innerHTML += msg + '<br/>';
}
// <<<< Utilities

/* >>>> Simulating Signaling Server using Broadcast Channel
 * You can send messages using signalServer.send(type, content)
 * and set on receive handler usin signalServer.onreceive(type, handlerFunction)
 */
const rcvdHandler = {};
const signalServer = new BroadcastChannel('test_channel');
signalServer.onmessage = function(ev) {
    console.log(ev.data);
    rcvdHandler[ev.data['type']](ev.data['content']); 
};
signalServer.send = async function(type, content) {
    signalServer.postMessage({type: type, content: content});
}
signalServer.onReceive = async function(type, handler) {
    rcvdHandler[type] = handler;
};
// <<<< Simulating Signaling Server


// Create PeerConnection Object
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
const peerConnection = new RTCPeerConnection(configuration);
// const peerConnection = new RTCPeerConnection(null);


// Create Send Channel - you will send your messages using this channel
const sendChannel = peerConnection.createDataChannel('sendChannel');
// Create listener for data channel created and sent by the remote
peerConnection.addEventListener('datachannel', event => {
    // Save the receive data channel - you receive your messages using this channel
    const recvChannel = event.channel;
    recvChannel.addEventListener('message', event => {
        alert(event.data);
    })    
});


// Listen to offers send by Signaling Server
signalServer.onReceive('offer', async function(offer) {
    log('Offer received from Signaling Server');
    peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
    log('Offer set as the remote description');
    const answer = await peerConnection.createAnswer();
    log('Answer created locally');
    await peerConnection.setLocalDescription(answer);
    log('Answer set as the local description');
    signalServer.send('answer', JSON.stringify(answer));
    log('Answer sent to Signaling Server');
});

// Listen to answers
signalServer.onReceive('answer', async function(answer) {
    log('Answer received');
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
    log('Answer set as the remote description');
});

// Listen to icecandidates sent by remote
signalServer.onReceive('icecandidate', async function(iceCandidate) {
    log('icecandidate received from Signaling Server');
    try {
        await peerConnection.addIceCandidate(JSON.parse(iceCandidate));
        log('icecandidate added to the peer connection');
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
});

// When an icecandidate is created locally, save it
peerConnection.addEventListener('icecandidate', event => {
    if (event.candidate) {
        log('icecandidate created locally');
        signalServer.send('icecandidate', JSON.stringify(event.candidate));
        log('icecandidate sent to Signaling Server');
    }
});

peerConnection.addEventListener('connectionstatechange', event => {
    if (peerConnection.connectionState === 'connected') {
        log('Connected');
    }
});

// Initiate connection
const connect = async function() {
    const offer = await peerConnection.createOffer();
    log('Offer created locally');
    await peerConnection.setLocalDescription(offer);
    log('Offer set as the local description');
    signalServer.send('offer', JSON.stringify(offer));
    log('Offer sent to Signaling Server');
};

// Send message
const sendData = async function() {
    sendChannel.send(document.getElementById('msg').value);
}
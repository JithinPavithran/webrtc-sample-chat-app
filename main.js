/* >>>> Simulating Signal Server using Broadcast Channel
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
// <<<< Simulating Signal Server


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
        console.log(event);
        alert(event.data);
    })    
});


// Listen to offers send by Signal Server
signalServer.onReceive('offer', async function(offer) {
    // When the offer is received, save it as remote description
    peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
    // Then create an answer
    const answer = await peerConnection.createAnswer();
    // Set the answer as local description
    await peerConnection.setLocalDescription(answer);
    // Send the answer back to Signal Server
    signalServer.send('answer', JSON.stringify(answer));
});

// Listen to answers
signalServer.onReceive('answer', async function(answer) {
    // save the answer as remote description
    await peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
});

// Listen to icecandidates sent by remote
signalServer.onReceive('icecandidate', async function(iceCandidate) {
    try {
        // Add the icecandidate
        await peerConnection.addIceCandidate(JSON.parse(iceCandidate));
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
});

// When an icecandidate is created locally, save it
peerConnection.addEventListener('icecandidate', event => {
    if (event.candidate) {
        signalServer.send('icecandidate', JSON.stringify(event.candidate));
    }
});

peerConnection.addEventListener('connectionstatechange', event => {
    if (peerConnection.connectionState === 'connected') {
        console.log('connected');
    }
});

// Initiate connection
const connect = async function() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    signalServer.send('offer', JSON.stringify(offer));
};

// Send message
const sendData = async function() {
    sendChannel.send(document.getElementById('msg').value);
}
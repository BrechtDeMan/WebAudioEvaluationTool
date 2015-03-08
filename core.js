/**
 * core.js
 * 
 * Main script to run, calls all other core functions and manages loading/store to backend.
 * Also contains all global variables.
 */

/* create the web audio API context and store in audioContext*/
var audioContext;
var projectXML;
var audioEngineContext;

window.onload = function() {
	// Function called once the browser has loaded all files.
	// This should perform any initial commands such as structure / loading documents
	
	// Create a web audio API context
	// NORE: Currently this will only work with webkit browsers (Chrome/Safari)!
	audioContext = new webkitAudioContext;
	
	// Create the audio engine object
	audioEngineContext = new AudioEngine();
}

function loadProjectSpec(url) {
	// Load the project document from the given URL, decode the XML and instruct audioEngine to get audio data
	// If url is null, request client to upload project XML document
	var r = new XMLHttpRequest();
	r.open('GET',url,true);
	r.onload = function() {
		loadProjectSpecCallback(r.response);
	}
	r.send();
}

function loadProjectSpecCallback(response) {
	// Function called after asynchronous download of XML project specification
	var decode = $.parseXML(response);
	projectXML = $(decode);
	
	// Now extract the setup tag
	var xmlSetup = projectXML.find('setup');
	var interfaceType = xmlSetup[0].attributes['interface'];
	var interfaceJS = document.createElement('script');
	interfaceJS.setAttribute("type","text/javascript");
	if (interfaceType.value == 'APE') {
		interfaceJS.setAttribute("src","ape.js");
	}
	document.getElementsByTagName("head")[0].appendChild(interfaceJS);
}

function createProjectSave(destURL) {
	// Save the data from interface into XML and send to destURL
	// If destURL is null then download XML in client
}

function AudioEngine() {
	
	// Create two output paths, the main outputGain and fooGain.
	// Output gain is default to 1 and any items for playback route here
	// Foo gain is used for analysis to ensure paths get processed, but are not heard
	// because web audio will optimise and any route which does not go to the destination gets ignored.
	this.outputGain = audioContext.createGain();
	this.fooGain = audioContext.createGain();
	this.fooGain.gain = 0;
	
	// Connect both gains to output
	this.outputGain.connect(audioContext.destination);
	this.fooGain.connect(audioContext.destination);
	
	// Create store for new audioObjects
	this.audioObjects = [];
	
	this.play = function() {
		// Send play command to all playback buffers for synchronised start
		// Also start timer callbacks to detect if playback has finished
	}
	
	this.stop = function() {
		// Send stop and reset command to all playback buffers
	}
	
	this.newTrack = function(url) {
		// Pull data from given URL into new audio buffer
		// URLs must either be from the same source OR be setup to 'Access-Control-Allow-Origin'
		var request = new XMLHttpRequest();
		request.open('GET',url,true);
		request.responseType = 'arraybuffer';
		// Create the audioObject with ID of the new track length;
		audioObjectId = this.audioObjects.length
		this.audioObjects[audioObjectId] = new audioObject(audioObjectId);
		
		// Create callback to decode the data asynchronously
		request.onload = function() {
			audioContext.decodeAudioData(request.response, function(decodedData) {
				audioObj = audioEngineContext.audioObjects[audioObjectId];
				audioObj.buffer = decodedData;
				audioObj.bufferNode.buffer = audioObj.buffer;
				audioObj.state = 1;
			}, console.log("Err - Buffer not added to " + audioObjectId));
		}
		request.send();
	}
	
}

function audioObject(id) {
	// The main buffer object with common control nodes to the AudioEngine
	
	this.id = id;
	this.state = 0; // 0 - no data, 1 - ready
	
	// Create a buffer and external gain control to allow internal patching of effects and volume leveling.
	this.bufferNode = audioContext.createBufferSource();
	this.outputGain = audioContext.createGain();
	
	// Connect buffer to the audio graph
	this.bufferNode.connect(this.outputGain);
	this.outputGain.connect(audioEngineContext.outputGain);
	
	// the audiobuffer is not designed for multi-start playback
	// When stopeed, the buffer node is deleted and recreated with the stored buffer.
	this.buffer;
	
	this.play = function(startTime) {
		this.bufferNode.start(startTime);
	}
	
	this.stop = function() {
		this.bufferNode.stop(0);
		this.bufferNode = audioContext.createBufferSource();
		this.bufferNode.connect(this.outputGain);
		this.bufferNode.buffer = this.buffer;
	}
	
}

/**
 * core.js
 * 
 * Main script to run, calls all other core functions and manages loading/store to backend.
 * Also contains all global variables.
 */


/*
 * 
 * WARNING!!!
 * 
 * 	YOU ARE VIEWING THE DEV VERSION. THERE IS NO GUARANTEE THIS WILL BE FULLY FUNCTIONAL
 * 
 * WARNING!!!
 * 
 */




/* create the web audio API context and store in audioContext*/
var audioContext; // Hold the browser web audio API
var projectXML; // Hold the parsed setup XML

var testXMLSetups = []; // Hold the parsed test instances
var testResultsHolders =[]; // Hold the results from each test for publishing to XML
var currentTrackOrder = []; // Hold the current XML tracks in their (randomised) order
var currentTestHolder; // Hold any intermediate results during test - metrics
var audioEngineContext; // The custome AudioEngine object
var projectReturn; // Hold the URL for the return
var preTestQuestions = document.createElement('PreTest'); // Store any pre-test question response
var postTestQuestions = document.createElement('PostTest'); // Store any post-test question response

window.onload = function() {
	// Function called once the browser has loaded all files.
	// This should perform any initial commands such as structure / loading documents
	
	// Create a web audio API context
	// Fixed for cross-browser support
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	audioContext = new AudioContext;
	
	// Create the audio engine object
	audioEngineContext = new AudioEngine();
};

function loadProjectSpec(url) {
	// Load the project document from the given URL, decode the XML and instruct audioEngine to get audio data
	// If url is null, request client to upload project XML document
	var r = new XMLHttpRequest();
	r.open('GET',url,true);
	r.onload = function() {
		loadProjectSpecCallback(r.response);
	};
	r.send();
};

function loadProjectSpecCallback(response) {
	// Function called after asynchronous download of XML project specification
	var decode = $.parseXML(response);
	projectXML = $(decode);
	
	// Now extract the setup tag
	var xmlSetup = projectXML.find('setup');
	// Detect the interface to use and load the relevant javascripts.
	var interfaceType = xmlSetup[0].attributes['interface'];
	var interfaceJS = document.createElement('script');
	interfaceJS.setAttribute("type","text/javascript");
	if (interfaceType.value == 'APE') {
		interfaceJS.setAttribute("src","ape.js");
		
		// APE comes with a css file
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.href = 'ape.css';
		
		document.getElementsByTagName("head")[0].appendChild(css);
	}
	document.getElementsByTagName("head")[0].appendChild(interfaceJS);
}

function createProjectSave(destURL) {
	// Save the data from interface into XML and send to destURL
	// If destURL is null then download XML in client
	// Now time to render file locally
	var xmlDoc = interfaceXMLSave();
	if (destURL == "null" || destURL == undefined) {
		var parent = document.createElement("div");
		parent.appendChild(xmlDoc);
		var file = [parent.innerHTML];
		var bb = new Blob(file,{type : 'application/xml'});
		var dnlk = window.URL.createObjectURL(bb);
		var a = document.createElement("a");
		a.hidden = '';
		a.href = dnlk;
		a.download = "save.xml";
		a.textContent = "Save File";
		
		var submitDiv = document.getElementById('download-point');
		submitDiv.appendChild(a);
	}
	return submitDiv;
}

function AudioEngine() {
	
	// Create two output paths, the main outputGain and fooGain.
	// Output gain is default to 1 and any items for playback route here
	// Foo gain is used for analysis to ensure paths get processed, but are not heard
	// because web audio will optimise and any route which does not go to the destination gets ignored.
	this.outputGain = audioContext.createGain();
	this.fooGain = audioContext.createGain();
	this.fooGain.gain = 0;
	
	// Use this to detect playback state: 0 - stopped, 1 - playing
	this.status = 0;
	
	// Connect both gains to output
	this.outputGain.connect(audioContext.destination);
	this.fooGain.connect(audioContext.destination);
	
	// Create the timer Object
	this.timer = new timer();
	// Create session metrics
	this.metric = new sessionMetrics(this);
	
	// Create store for new audioObjects
	this.audioObjects = [];
	
	this.play = function() {
		// Send play command to all playback buffers for synchronised start
		// Also start timer callbacks to detect if playback has finished
		if (this.status == 0) {
			this.timer.startTest();
			// First get current clock
			var timer = audioContext.currentTime;
			// Add 3 seconds
			timer += 3.0;
			
			// Send play to all tracks
			for (var i=0; i<this.audioObjects.length; i++)
			{
				this.audioObjects[i].play(timer);
			}
			this.status = 1;
		}
	};
	
	this.stop = function() {
		// Send stop and reset command to all playback buffers
		if (this.status == 1) {
			for (var i=0; i<this.audioObjects.length; i++)
			{
				this.audioObjects[i].stop();
			}
			this.status = 0;
		}
	};
	
	this.selectedTrack = function(id) {
		for (var i=0; i<this.audioObjects.length; i++)
		{
			if (id == i) {
				this.audioObjects[i].outputGain.gain.value = 1.0;
			} else {
				this.audioObjects[i].outputGain.gain.value = 0.0;
			}
		}
	};
	
	
	this.newTrack = function(url) {
		// Pull data from given URL into new audio buffer
		// URLs must either be from the same source OR be setup to 'Access-Control-Allow-Origin'
		
		// Create the audioObject with ID of the new track length;
		audioObjectId = this.audioObjects.length;
		this.audioObjects[audioObjectId] = new audioObject(audioObjectId);

		// AudioObject will get track itself.
		this.audioObjects[audioObjectId].constructTrack(url);
	};
	
}

function audioObject(id) {
	// The main buffer object with common control nodes to the AudioEngine
	
	this.id = id;
	this.state = 0; // 0 - no data, 1 - ready
	this.url = null; // Hold the URL given for the output back to the results.
	this.metric = new metricTracker();
	
	// Create a buffer and external gain control to allow internal patching of effects and volume leveling.
	this.bufferNode = audioContext.createBufferSource();
	this.outputGain = audioContext.createGain();
	
	// Default output gain to be zero
	this.outputGain.gain.value = 0.0;
	
	// Connect buffer to the audio graph
	this.bufferNode.connect(this.outputGain);
	this.outputGain.connect(audioEngineContext.outputGain);
	
	// the audiobuffer is not designed for multi-start playback
	// When stopeed, the buffer node is deleted and recreated with the stored buffer.
	this.buffer;
	
	this.play = function(startTime) {
		this.bufferNode.start(startTime);
	};
	
	this.stop = function() {
		this.bufferNode.stop(0);
		this.bufferNode = audioContext.createBufferSource();
		this.bufferNode.connect(this.outputGain);
		this.bufferNode.buffer = this.buffer;
		this.bufferNode.loop = true;
	};

	this.constructTrack = function(url) {
		var request = new XMLHttpRequest();
		this.url = url;
		request.open('GET',url,true);
		request.responseType = 'arraybuffer';
		
		var audioObj = this;
		
		// Create callback to decode the data asynchronously
		request.onloadend = function() {
			audioContext.decodeAudioData(request.response, function(decodedData) {
				audioObj.buffer = decodedData;
				audioObj.bufferNode.buffer = audioObj.buffer;
				audioObj.bufferNode.loop = true;
				audioObj.state = 1;
			}, function(){
				// Should only be called if there was an error, but sometimes gets called continuously
				// Check here if the error is genuine
				if (audioObj.state == 0 || audioObj.buffer == undefined) {
					// Genuine error
					console.log('FATAL - Error loading buffer on '+audioObj.id);
				}
			});
		};
		request.send();
	};
	
}

function timer()
{
	/* Timer object used in audioEngine to keep track of session timings
	 * Uses the timer of the web audio API, so sample resolution
	 */
	this.testStarted = false;
	this.testStartTime = 0;
	this.testDuration = 0;
	this.minimumTestTime = 0; // No minimum test time
	this.startTest = function()
	{
		if (this.testStarted == false)
		{
			this.testStartTime = audioContext.currentTime;
			this.testStarted = true;
			this.updateTestTime();
		}
	};
	this.stopTest = function()
	{
		if (this.testStarted)
		{
			this.testDuration = this.getTestTime();
			this.testStarted = false;
		} else {
			console.log('ERR: Test tried to end before beginning');
		}
	};
	this.updateTestTime = function()
	{
		if (this.testStarted)
		{
			this.testDuration = audioContext.currentTime - this.testStartTime;
		}
	};
	this.getTestTime = function()
	{
		this.updateTestTime();
		return this.testDuration;
	};
}

function sessionMetrics(engine)
{
	/* Used by audioEngine to link to audioObjects to minimise the timer call timers;
	 */
	this.engine = engine;
	this.lastClicked = -1;
	this.data = -1;
	
	this.sliderMoveStart = function(id)
	{
		if (this.data == -1)
		{
			this.data = id;
		} else {
			console.log('ERROR: Metric tracker detecting two moves!');
			this.data = -1;
		}
	};
	this.sliderMoved = function()
	{
		var time = engine.timer.getTestTime();
		var id = this.data;
		this.data = -1;
		var sliderObj = document.getElementsByClassName('track-slider')[id];
		var position = Number(sliderObj.style.left.substr(0,sliderObj.style.left.length-2));
		if (engine.timer.testStarted)
		{
			engine.audioObjects[id].metric.moved(time,position);
		} else {
			engine.audioObjects[id].metric.initialised(position);
		}
	};
	
	this.sliderPlayed = function(id)
	{
		var time = engine.timer.getTestTime();
		if (engine.timer.testStarted)
		{
			if (this.lastClicked >= 0)
			{
				engine.audioObjects[this.lastClicked].metric.listening(time);
			}
			this.lastClicked = id;
			engine.audioObjects[id].metric.listening(time);
		}
	};
}

function metricTracker()
{
	/* Custom object to track and collect metric data
	 * Used only inside the audioObjects object.
	 */
	
	this.listenedTimer = 0;
	this.listenStart = 0;
	this.initialPosition = 0;
	this.movementTracker = [];
	this.wasListenedTo = false;
	this.wasMoved = false;
	this.hasComments = false;
	
	this.initialised = function(position)
	{
		this.initialPosition = position;
	};
	
	this.moved = function(time,position)
	{
		this.wasMoved = true;
		this.movementTracker[this.movementTracker.length] = [time, position];
	};
	
	this.listening = function(time)
	{
		if (this.listenStart == 0)
		{
			this.wasListenedTo = true;
			this.listenStart = time;
		} else {
			this.listenedTimer += (time - this.listenStart);
			this.listenStart = 0;
		}
	};
}
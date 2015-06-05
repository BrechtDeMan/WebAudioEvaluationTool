/**
 * core.js
 * 
 * Main script to run, calls all other core functions and manages loading/store to backend.
 * Also contains all global variables.
 */

/* create the web audio API context and store in audioContext*/
var audioContext; // Hold the browser web audio API
var projectXML; // Hold the parsed setup XML
var specification;
var interfaceContext;
var popup; // Hold the interfacePopup object
var testState;
var currentTrackOrder = []; // Hold the current XML tracks in their (randomised) order
var audioEngineContext; // The custome AudioEngine object
var projectReturn; // Hold the URL for the return


// Add a prototype to the bufferSourceNode to reference to the audioObject holding it
AudioBufferSourceNode.prototype.owner = undefined;

window.onload = function() {
	// Function called once the browser has loaded all files.
	// This should perform any initial commands such as structure / loading documents
	
	// Create a web audio API context
	// Fixed for cross-browser support
	var AudioContext = window.AudioContext || window.webkitAudioContext;
	audioContext = new AudioContext;
	
	// Create test state
	testState = new stateMachine();
	
	// Create the audio engine object
	audioEngineContext = new AudioEngine();
	
	// Create the popup interface object
	popup = new interfacePopup();
	
	// Create the specification object
	specification = new Specification();
	
	// Create the interface object
	interfaceContext = new Interface(specification);
};

function interfacePopup() {
	// Creates an object to manage the popup
	this.popup = null;
	this.popupContent = null;
	this.popupButton = null;
	this.popupOptions = null;
	this.currentIndex = null;
	this.responses = null;
	
	this.createPopup = function(){
		// Create popup window interface
		var insertPoint = document.getElementById("topLevelBody");
		var blank = document.createElement('div');
		blank.className = 'testHalt';
		
		this.popup = document.createElement('div');
		this.popup.id = 'popupHolder';
		this.popup.className = 'popupHolder';
		this.popup.style.position = 'absolute';
		this.popup.style.left = (window.innerWidth/2)-250 + 'px';
		this.popup.style.top = (window.innerHeight/2)-125 + 'px';
		
		this.popupContent = document.createElement('div');
		this.popupContent.id = 'popupContent';
		this.popupContent.style.marginTop = '25px';
		this.popupContent.align = 'center';
		this.popup.appendChild(this.popupContent);
		
		this.popupButton = document.createElement('button');
		this.popupButton.className = 'popupButton';
		this.popupButton.innerHTML = 'Next';
		this.popupButton.onclick = function(){popup.buttonClicked();};
		this.popup.style.zIndex = -1;
		this.popup.style.visibility = 'hidden';
		blank.style.zIndex = -2;
		blank.style.visibility = 'hidden';
		insertPoint.appendChild(this.popup);
		insertPoint.appendChild(blank);
	};
	
	this.showPopup = function(){
		if (this.popup == null) {
			this.createPopup();
		}
		this.popup.style.zIndex = 3;
		this.popup.style.visibility = 'visible';
		var blank = document.getElementsByClassName('testHalt')[0];
		blank.style.zIndex = 2;
		blank.style.visibility = 'visible';
	};
	
	this.hidePopup = function(){
		this.popup.style.zIndex = -1;
		this.popup.style.visibility = 'hidden';
		var blank = document.getElementsByClassName('testHalt')[0];
		blank.style.zIndex = -2;
		blank.style.visibility = 'hidden';
	};
	
	this.postNode = function() {
		// This will take the node from the popupOptions and display it
		var node = this.popupOptions[this.currentIndex];
		this.popupContent.innerHTML = null;
		if (node.type == 'statement') {
			var span = document.createElement('span');
			span.textContent = node.statement;
			this.popupContent.appendChild(span);
		} else if (node.type == 'question') {
			var span = document.createElement('span');
			span.textContent = node.question;
			var textArea = document.createElement('textarea');
			var br = document.createElement('br');
			this.popupContent.appendChild(span);
			this.popupContent.appendChild(br);
			this.popupContent.appendChild(textArea);
			this.popupContent.childNodes[2].focus();
		}
		this.popupContent.appendChild(this.popupButton);
	};
	
	this.initState = function(node) {
		//Call this with your preTest and postTest nodes when needed to
		// initialise the popup procedure.
		this.popupOptions = node.options;
		if (this.popupOptions.length > 0) {
			if (node.type == 'pretest') {
				this.responses = document.createElement('PreTest');
			} else if (node.type == 'posttest') {
				this.responses = document.createElement('PostTest');
			} else {
				console.log ('WARNING - popup node neither pre or post!');
				this.responses = document.createElement('responses');
			}
			this.currentIndex = 0;
			this.showPopup();
			this.postNode();
		} else {
			advanceState();
		}
	};
	
	this.buttonClicked = function() {
		// Each time the popup button is clicked!
		var node = this.popupOptions[this.currentIndex];
		if (node.type == 'question') {
			// Must extract the question data
			var textArea = $(popup.popupContent).find('textarea')[0];
			if (node.mandatory == true && textArea.value.length == 0) {
				alert('This question is mandatory');
				return;
			} else {
				// Save the text content
				var hold = document.createElement('comment');
				hold.id = node.id;
				hold.innerHTML = textArea.value;
				console.log("Question: "+ node.textContent);
				console.log("Question Response: "+ textArea.value);
				this.responses.appendChild(hold);
			}
		}
		this.currentIndex++;
		if (this.currentIndex < this.popupOptions.length) {
			this.postNode();
		} else {
			// Reached the end of the popupOptions
			this.hidePopup();
			if (this.responses.nodeName == testState.stateResults[testState.stateIndex].nodeName) {
				testState.stateResults[testState.stateIndex] = this.responses;
			} else {
				testState.stateResults[testState.stateIndex].appendChild(this.responses);
			}
			advanceState();
		}
	};
}

function advanceState()
{
	// Just for complete clarity
	testState.advanceState();
}

function stateMachine()
{
	// Object prototype for tracking and managing the test state
	this.stateMap = [];
	this.stateIndex = null;
	this.currentStateMap = [];
	this.currentIndex = null;
	this.currentTestId = 0;
	this.stateResults = [];
	this.timerCallBackHolders = null;
	this.initialise = function(){
		if (this.stateMap.length > 0) {
			if(this.stateIndex != null) {
				console.log('NOTE - State already initialise');
			}
			this.stateIndex = -1;
			var that = this;
			for (var id=0; id<this.stateMap.length; id++){
				var name = this.stateMap[id].type;
				var obj = document.createElement(name);
				this.stateResults.push(obj);
			}
		} else {
			conolse.log('FATAL - StateMap not correctly constructed. EMPTY_STATE_MAP');
		}
	};
	this.advanceState = function(){
		if (this.stateIndex == null) {
			this.initialise();
		}
		if (this.stateIndex == -1) {
			console.log('Starting test...');
		}
		if (this.currentIndex == null){
			if (this.currentStateMap.type == "audioHolder") {
				// Save current page
				this.testPageCompleted(this.stateResults[this.stateIndex],this.currentStateMap,this.currentTestId);
				this.currentTestId++;
			}
			this.stateIndex++;
			if (this.stateIndex >= this.stateMap.length) {
				console.log('Test Completed');
				createProjectSave(specification.projectReturn);
			} else {
				this.currentStateMap = this.stateMap[this.stateIndex];
				if (this.currentStateMap.type == "audioHolder") {
					console.log('Loading test page');
					loadTest(this.currentStateMap);
					this.initialiseInnerState(this.currentStateMap);
				} else if (this.currentStateMap.type == "pretest" || this.currentStateMap.type == "posttest") {
					if (this.currentStateMap.options.length >= 1) {
						popup.initState(this.currentStateMap);
					} else {
						this.advanceState();
					}
				} else {
					this.advanceState();
				}
			}
		} else {
			this.advanceInnerState();
		}
	};
	
	this.testPageCompleted = function(store, testXML, testId) {
		// Function called each time a test page has been completed
		// Can be used to over-rule default behaviour
		
		pageXMLSave(store, testXML);
	};
	
	this.initialiseInnerState = function(node) {
		// Parses the received testXML for pre and post test options
		this.currentStateMap = [];
		var preTest = node.preTest;
		var postTest = node.postTest;
		if (preTest == undefined) {preTest = document.createElement("preTest");}
		if (postTest == undefined){postTest= document.createElement("postTest");}
		this.currentStateMap.push(preTest);
		this.currentStateMap.push(node);
		this.currentStateMap.push(postTest);
		this.currentIndex = -1;
		this.advanceInnerState();
	};
	
	this.advanceInnerState = function() {
		this.currentIndex++;
		if (this.currentIndex >= this.currentStateMap.length) {
			this.currentIndex = null;
			this.currentStateMap = this.stateMap[this.stateIndex];
			this.advanceState();
		} else {
			if (this.currentStateMap[this.currentIndex].type == "audioHolder") {
				console.log("Loading test page"+this.currentTestId);
			} else if (this.currentStateMap[this.currentIndex].type == "pretest") {
				popup.initState(this.currentStateMap[this.currentIndex]);
			} else if (this.currentStateMap[this.currentIndex].type == "posttest") {
				popup.initState(this.currentStateMap[this.currentIndex]);
			} else {
				this.advanceInnerState();
			}
		}
	};
	
	this.previousState = function(){};
}

function testEnded(testId)
{
	pageXMLSave(testId);
	if (testXMLSetups.length-1 > testId)
	{
		// Yes we have another test to perform
		testId = (Number(testId)+1);
		currentState = 'testRun-'+testId;
		loadTest(testId);
	} else {
		console.log('Testing Completed!');
		currentState = 'postTest';
		// Check for any post tests
		var xmlSetup = projectXML.find('setup');
		var postTest = xmlSetup.find('PostTest')[0];
		popup.initState(postTest);
	}
}

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
	//var decode = $.parseXML(response);
	//projectXML = $(decode);
	
	var parse = new DOMParser();
	projectXML = parse.parseFromString(response,'text/xml');
	
	// Build the specification
	specification.decode();
	
	testState.stateMap.push(specification.preTest);
	 
	// New check if we need to randomise the test order
	if (specification.randomiseOrder)
	{
 		specification.audioHolders = randomiseOrder(specification.audioHolders);
	}
	
	$(specification.audioHolders).each(function(index,elem){
		testState.stateMap.push(elem);
	});
	 
	 testState.stateMap.push(specification.postTest);
	 
	// Obtain the metrics enabled
	$(specification.metrics).each(function(index,node){
		var enabled = node.textContent;
		switch(node.enabled)
		{
		case 'testTimer':
			sessionMetrics.prototype.enableTestTimer = true;
			break;
		case 'elementTimer':
			sessionMetrics.prototype.enableElementTimer = true;
			break;
		case 'elementTracker':
			sessionMetrics.prototype.enableElementTracker = true;
			break;
		case 'elementListenTracker':
			sessionMetrics.prototype.enableElementListenTracker = true;
			break;
		case 'elementInitialPosition':
			sessionMetrics.prototype.enableElementInitialPosition = true;
			break;
		case 'elementFlagListenedTo':
			sessionMetrics.prototype.enableFlagListenedTo = true;
			break;
		case 'elementFlagMoved':
			sessionMetrics.prototype.enableFlagMoved = true;
			break;
		case 'elementFlagComments':
			sessionMetrics.prototype.enableFlagComments = true;
			break;
		}
	});
	
	
	
	// Detect the interface to use and load the relevant javascripts.
	var interfaceJS = document.createElement('script');
	interfaceJS.setAttribute("type","text/javascript");
	if (specification.interfaceType == 'APE') {
		interfaceJS.setAttribute("src","ape.js");
		
		// APE comes with a css file
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.href = 'ape.css';
		
		document.getElementsByTagName("head")[0].appendChild(css);
	}
	document.getElementsByTagName("head")[0].appendChild(interfaceJS);
	
	// Define window callbacks for interface
	window.onresize = function(event){resizeWindow(event);};
}

function createProjectSave(destURL) {
	// Save the data from interface into XML and send to destURL
	// If destURL is null then download XML in client
	// Now time to render file locally
	var xmlDoc = interfaceXMLSave();
	var parent = document.createElement("div");
	parent.appendChild(xmlDoc);
	var file = [parent.innerHTML];
	if (destURL == "null" || destURL == undefined) {
		var bb = new Blob(file,{type : 'application/xml'});
		var dnlk = window.URL.createObjectURL(bb);
		var a = document.createElement("a");
		a.hidden = '';
		a.href = dnlk;
		a.download = "save.xml";
		a.textContent = "Save File";
		
		popup.showPopup();
		popup.popupContent.innerHTML = null;
		popup.popupContent.appendChild(a);
	} else {
		var xmlhttp = new XMLHttpRequest;
		xmlhttp.open("POST",destURL,true);
		xmlhttp.setRequestHeader('Content-Type', 'text/xml');
		xmlhttp.onerror = function(){
			console.log('Error saving file to server! Presenting download locally');
			createProjectSave(null);
		};
		xmlhttp.onreadystatechange  = function() {
			console.log(xmlhttp.status);
			if (xmlhttp.status != 200 && xmlhttp.readyState == 4) {
				createProjectSave(null);
			}
		};
		xmlhttp.send(file);
	}
}

// Only other global function which must be defined in the interface class. Determines how to create the XML document.
function interfaceXMLSave(){
	// Create the XML string to be exported with results
	var xmlDoc = document.createElement("BrowserEvaluationResult");
	xmlDoc.appendChild(returnDateNode());
	for (var i=0; i<testState.stateResults.length; i++)
	{
		xmlDoc.appendChild(testState.stateResults[i]);
	}
	
	return xmlDoc;
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
	this.audioObjectsReady = false;
	
	// Connect both gains to output
	this.outputGain.connect(audioContext.destination);
	this.fooGain.connect(audioContext.destination);
	
	// Create the timer Object
	this.timer = new timer();
	// Create session metrics
	this.metric = new sessionMetrics(this);
	
	this.loopPlayback = false;
	
	// Create store for new audioObjects
	this.audioObjects = [];
	
	this.play = function() {
		// Start the timer and set the audioEngine state to playing (1)
		if (this.status == 0) {
			// Check if all audioObjects are ready
			if (this.audioObjectsReady == false) {
				this.audioObjectsReady = this.checkAllReady();
			}
			if (this.audioObjectsReady == true) {
				this.timer.startTest();
				if (this.loopPlayback) {
					for(var i=0; i<this.audioObjects.length; i++) {
						this.audioObjects[i].play(this.timer.getTestTime()+1);
					}
				}
				this.status = 1;
			}
		}
	};
	
	this.stop = function() {
		// Send stop and reset command to all playback buffers and set audioEngine state to stopped (1)
		if (this.status == 1) {
			for (var i=0; i<this.audioObjects.length; i++)
			{
				this.audioObjects[i].stop();
			}
			this.status = 0;
		}
	};
	
	
	this.newTrack = function(element) {
		// Pull data from given URL into new audio buffer
		// URLs must either be from the same source OR be setup to 'Access-Control-Allow-Origin'
		
		// Create the audioObject with ID of the new track length;
		audioObjectId = this.audioObjects.length;
		this.audioObjects[audioObjectId] = new audioObject(audioObjectId);

		// AudioObject will get track itself.
		this.audioObjects[audioObjectId].specification = element;
		this.audioObjects[audioObjectId].constructTrack(element.parent.hostURL + element.url);
		return this.audioObjects[audioObjectId];
	};
	
	this.newTestPage = function() {
		this.state = 0;
		this.audioObjectsReady = false;
		this.metric.reset();
		this.audioObjects = [];
	};
	
	this.checkAllPlayed = function() {
		arr = [];
		for (var id=0; id<this.audioObjects.length; id++) {
			if (this.audioObjects[id].metric.wasListenedTo == false) {
				arr.push(this.audioObjects[id].id);
			}
		}
		return arr;
	};
	
	this.checkAllReady = function() {
		var ready = true;
		for (var i=0; i<this.audioObjects.length; i++) {
			if (this.audioObjects[i].state == 0) {
				// Track not ready
				console.log('WAIT -- audioObject '+i+' not ready yet!');
				ready = false;
			};
		}
		return ready;
	};
	
}

function audioObject(id) {
	// The main buffer object with common control nodes to the AudioEngine
	
	this.specification;
	this.id = id;
	this.state = 0; // 0 - no data, 1 - ready
	this.url = null; // Hold the URL given for the output back to the results.
	this.metric = new metricTracker(this);
	
	// Bindings for GUI
	this.interfaceDOM = null;
	this.commentDOM = null;
	
	// Create a buffer and external gain control to allow internal patching of effects and volume leveling.
	this.bufferNode = undefined;
	this.outputGain = audioContext.createGain();
	
	// Default output gain to be zero
	this.outputGain.gain.value = 0.0;
	
	// Connect buffer to the audio graph
	this.outputGain.connect(audioEngineContext.outputGain);
	
	// the audiobuffer is not designed for multi-start playback
	// When stopeed, the buffer node is deleted and recreated with the stored buffer.
	this.buffer;
    
	this.loopStart = function() {
		this.outputGain.gain.value = 1.0;
		this.metric.startListening(audioEngineContext.timer.getTestTime());
	};
	
	this.loopStop = function() {
		if (this.outputGain.gain.value != 0.0) {
			this.outputGain.gain.value = 0.0;
			this.metric.stopListening(audioEngineContext.timer.getTestTime());
		}
	};
	
	this.play = function(startTime) {
		this.bufferNode = audioContext.createBufferSource();
		this.bufferNode.owner = this;
		this.bufferNode.connect(this.outputGain);
		this.bufferNode.buffer = this.buffer;
		this.bufferNode.loop = audioEngineContext.loopPlayback;
		this.bufferNode.onended = function() {
			// Safari does not like using 'this' to reference the calling object!
			event.srcElement.owner.metric.stopListening(audioEngineContext.timer.getTestTime());
		};
		if (this.bufferNode.loop == false) {
			this.metric.startListening(audioEngineContext.timer.getTestTime());
		}
		this.bufferNode.start(startTime);
	};
	
	this.stop = function() {
		if (this.bufferNode != undefined)
		{
			this.bufferNode.stop(0);
			this.bufferNode = undefined;
			this.metric.stopListening(audioEngineContext.timer.getTestTime());
		}
	};
	
	this.getCurrentPosition = function() {
		var time = audioEngineContext.timer.getTestTime();
		if (this.bufferNode != undefined) {
			if (this.bufferNode.loop == true) {
				if (audioEngineContext.status  == 1) {
					return time%this.buffer.duration;
				} else {
					return 0;
				}
			} else {
				if (this.metric.listenHold) {
					return time - this.metric.listenStart;
				} else {
					return 0;
				}
			}
		} else {
			return 0;
		}
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
	
	this.exportXMLDOM = function() {
		var root = document.createElement('audioElement');
		root.id = this.specification.id;
		root.setAttribute('url',this.url);
		root.appendChild(this.interfaceDOM.exportXMLDOM());
		root.appendChild(this.commentDOM.exportXMLDOM());
		root.appendChild(this.metric.exportXMLDOM());
		return root;
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
			audioEngineContext.metric.initialiseTest();
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
	this.reset = function() {
		this.lastClicked = -1;
		this.data = -1;
	};
	this.initialiseTest = function(){};
}

function metricTracker(caller)
{
	/* Custom object to track and collect metric data
	 * Used only inside the audioObjects object.
	 */
	
	this.listenedTimer = 0;
	this.listenStart = 0;
	this.listenHold = false;
	this.initialPosition = -1;
	this.movementTracker = [];
	this.listenTracker =[];
	this.wasListenedTo = false;
	this.wasMoved = false;
	this.hasComments = false;
	this.parent = caller;
	
	this.initialised = function(position)
	{
		if (this.initialPosition == -1) {
			this.initialPosition = position;
		}
	};
	
	this.moved = function(time,position)
	{
		this.wasMoved = true;
		this.movementTracker[this.movementTracker.length] = [time, position];
	};
	
	this.startListening = function(time)
	{
		if (this.listenHold == false)
		{
			this.wasListenedTo = true;
			this.listenStart = time;
			this.listenHold = true;
			
			var evnt = document.createElement('event');
			var testTime = document.createElement('testTime');
			testTime.setAttribute('start',time);
			var bufferTime = document.createElement('bufferTime');
			bufferTime.setAttribute('start',this.parent.getCurrentPosition());
			evnt.appendChild(testTime);
			evnt.appendChild(bufferTime);
			this.listenTracker.push(evnt);
			
			console.log('slider ' + this.parent.id + ' played (' + time + ')'); // DEBUG/SAFETY: show played slider id
		}
	};
	
	this.stopListening = function(time)
	{
		if (this.listenHold == true)
		{
			var diff = time - this.listenStart;
			this.listenedTimer += (diff);
			this.listenStart = 0;
			this.listenHold = false;
			
			var evnt = this.listenTracker[this.listenTracker.length-1];
			var testTime = evnt.getElementsByTagName('testTime')[0];
			var bufferTime = evnt.getElementsByTagName('bufferTime')[0];
			testTime.setAttribute('stop',time);
			bufferTime.setAttribute('stop',this.parent.getCurrentPosition());
			console.log('slider ' + this.parent.id + ' played for (' + diff + ')'); // DEBUG/SAFETY: show played slider id
		}
	};
	
	this.exportXMLDOM = function() {
		var root = document.createElement('metric');
		if (audioEngineContext.metric.enableElementTimer) {
			var mElementTimer = document.createElement('metricresult');
			mElementTimer.setAttribute('name','enableElementTimer');
			mElementTimer.textContent = this.listenedTimer;
			root.appendChild(mElementTimer);
		}
		if (audioEngineContext.metric.enableElementTracker) {
			var elementTrackerFull = document.createElement('metricResult');
			elementTrackerFull.setAttribute('name','elementTrackerFull');
			for (var k=0; k<this.movementTracker.length; k++)
			{
				var timePos = document.createElement('timePos');
				timePos.id = k;
				var time = document.createElement('time');
				time.textContent = this.movementTracker[k][0];
				var position = document.createElement('position');
				position.textContent = this.movementTracker[k][1];
				timePos.appendChild(time);
				timePos.appendChild(position);
				elementTrackerFull.appendChild(timePos);
			}
			root.appendChild(elementTrackerFull);
		}
		if (audioEngineContext.metric.enableElementListenTracker) {
			var elementListenTracker = document.createElement('metricResult');
			elementListenTracker.setAttribute('name','elementListenTracker');
			for (var k=0; k<this.listenTracker.length; k++) {
				elementListenTracker.appendChild(this.listenTracker[k]);
			}
			root.appendChild(elementListenTracker);
		}
		if (audioEngineContext.metric.enableElementInitialPosition) {
			var elementInitial = document.createElement('metricResult');
			elementInitial.setAttribute('name','elementInitialPosition');
			elementInitial.textContent = this.initialPosition;
			root.appendChild(elementInitial);
		}
		if (audioEngineContext.metric.enableFlagListenedTo) {
			var flagListenedTo = document.createElement('metricResult');
			flagListenedTo.setAttribute('name','elementFlagListenedTo');
			flagListenedTo.textContent = this.wasListenedTo;
			root.appendChild(flagListenedTo);
		}
		if (audioEngineContext.metric.enableFlagMoved) {
			var flagMoved = document.createElement('metricResult');
			flagMoved.setAttribute('name','elementFlagMoved');
			flagMoved.textContent = this.wasMoved;
			root.appendChild(flagMoved);
		}
		if (audioEngineContext.metric.enableFlagComments) {
			var flagComments = document.createElement('metricResult');
			flagComments.setAttribute('name','elementFlagComments');
			if (this.parent.commentDOM == null)
				{flag.textContent = 'false';}
			else if (this.parent.commentDOM.textContent.length == 0) 
				{flag.textContent = 'false';}
			else 
				{flag.textContet = 'true';}
			root.appendChild(flagComments);
		}
		
		return root;
	};
}

function randomiseOrder(input)
{
	// This takes an array of information and randomises the order
	var N = input.length;
	var K = N;
	var holdArr = [];
	for (var n=0; n<N; n++)
	{
		// First pick a random number
		var r = Math.random();
		// Multiply and floor by the number of elements left
		r = Math.floor(r*input.length);
		// Pick out that element and delete from the array
		holdArr.push(input.splice(r,1)[0]);
	}
	return holdArr;
}

function returnDateNode()
{
	// Create an XML Node for the Date and Time a test was conducted
	// Structure is
	// <datetime> 
	//	<date year="##" month="##" day="##">DD/MM/YY</date>
	//	<time hour="##" minute="##" sec="##">HH:MM:SS</time>
	// </datetime>
	var dateTime = new Date();
	var year = document.createAttribute('year');
	var month = document.createAttribute('month');
	var day = document.createAttribute('day');
	var hour = document.createAttribute('hour');
	var minute = document.createAttribute('minute');
	var secs = document.createAttribute('secs');
	
	year.nodeValue = dateTime.getFullYear();
	month.nodeValue = dateTime.getMonth()+1;
	day.nodeValue = dateTime.getDate();
	hour.nodeValue = dateTime.getHours();
	minute.nodeValue = dateTime.getMinutes();
	secs.nodeValue = dateTime.getSeconds();
	
	var hold = document.createElement("datetime");
	var date = document.createElement("date");
	date.textContent = year.nodeValue+'/'+month.nodeValue+'/'+day.nodeValue;
	var time = document.createElement("time");
	time.textContent = hour.nodeValue+':'+minute.nodeValue+':'+secs.nodeValue;
	
	date.setAttributeNode(year);
	date.setAttributeNode(month);
	date.setAttributeNode(day);
	time.setAttributeNode(hour);
	time.setAttributeNode(minute);
	time.setAttributeNode(secs);
	
	hold.appendChild(date);
	hold.appendChild(time);
	return hold
	
}

function testWaitIndicator() {
	if (audioEngineContext.checkAllReady() == false) {
		var hold = document.createElement("div");
		hold.id = "testWaitIndicator";
		hold.className = "indicator-box";
		hold.style.zIndex = 3;
		var span = document.createElement("span");
		span.textContent = "Please wait! Elements still loading";
		hold.appendChild(span);
		var blank = document.createElement('div');
		blank.className = 'testHalt';
		blank.id = "testHaltBlank";
		var body = document.getElementsByTagName('body')[0];
		body.appendChild(hold);
		body.appendChild(blank);
		testWaitTimerIntervalHolder = setInterval(function(){
			var ready = audioEngineContext.checkAllReady();
			if (ready) {
				var elem = document.getElementById('testWaitIndicator');
				var blank = document.getElementById('testHaltBlank');
				var body = document.getElementsByTagName('body')[0];
				body.removeChild(elem);
				body.removeChild(blank);
				clearInterval(testWaitTimerIntervalHolder);
			}
		},500,false);
	}
}

var testWaitTimerIntervalHolder = null;

function Specification() {
	// Handles the decoding of the project specification XML into a simple JavaScript Object.
	
	this.interfaceType;
	this.projectReturn;
	this.randomiseOrder;
	this.collectMetrics;
	this.preTest;
	this.postTest;
	this.metrics =[];
	
	this.audioHolders = [];
	
	this.decode = function() {
		// projectXML - DOM Parsed document
		var setupNode = projectXML.getElementsByTagName('setup')[0];
		this.interfaceType = setupNode.getAttribute('interface');
		this.projectReturn = setupNode.getAttribute('projectReturn');
		if (setupNode.getAttribute('randomiseOrder') == "true") {
			this.randomiseOrder = true;
		} else {this.randomiseOrder = false;}
		if (setupNode.getAttribute('collectMetrics') == "true") {
			this.collectMetrics = true;
		} else {this.collectMetrics = false;}
		var metricCollection = setupNode.getElementsByTagName('Metric');
		
		this.preTest = new this.prepostNode('pretest',setupNode.getElementsByTagName('PreTest'));
		this.postTest = new this.prepostNode('posttest',setupNode.getElementsByTagName('PostTest'));
		
		if (metricCollection.length > 0) {
			metricCollection = metricCollection[0].getElementsByTagName('metricEnable');
			for (var i=0; i<metricCollection.length; i++) {
				this.metrics.push(new this.metricNode(metricCollection[i].textContent));
			}
		}
		
		var audioHolders = projectXML.getElementsByTagName('audioHolder');
		for (var i=0; i<audioHolders.length; i++) {
			this.audioHolders.push(new this.audioHolderNode(this,audioHolders[i]));
		}
		
	};
	
	this.prepostNode = function(type,Collection) {
		this.type = type;
		this.options = [];
		
		this.OptionNode = function(child) {
			this.type = child.nodeName;
			if (child.nodeName == "question") {
				this.id = child.id;
				this.mandatory;
				if (child.getAttribute('mandatory') == "true") {this.mandatory = true;}
				else {this.mandatory = false;}
				this.question = child.textContent;
			} else if (child.nodeName == "statement") {
				this.statement = child.textContent;
			}
		};
		
		// On construction:
		if (Collection.length != 0) {
			Collection = Collection[0];
			if (Collection.childElementCount != 0) {
				var child = Collection.firstElementChild;
				this.options.push(new this.OptionNode(child));
				while (child.nextElementSibling != null) {
					child = child.nextElementSibling;
					this.options.push(new this.OptionNode(child));
				}
			}
		}
	};
	
	this.metricNode = function(name) {
		this.enabled = name;
	};
	
	this.audioHolderNode = function(parent,xml) {
		this.type = 'audioHolder';
		this.interfaceNode = function(DOM) {
			var title = DOM.getElementsByTagName('title');
			if (title.length == 0) {this.title = null;}
			else {this.title = title[0].textContent;}
			
			var scale = DOM.getElementsByTagName('scale');
			this.scale = [];
			for (var i=0; i<scale.length; i++) {
				var arr = [null, null];
				arr[0] = scale[i].getAttribute('position');
				arr[1] = scale[i].textContent;
				this.scale.push(arr);
			}
		};
		
		this.audioElementNode = function(parent,xml) {
			this.url = xml.getAttribute('url');
			this.id = xml.id;
			this.parent = parent;
		};
		
		this.commentQuestionNode = function(xml) {
			this.id = xml.id;
			if (xml.getAttribute('mandatory') == 'true') {this.mandatory = true;}
			else {this.mandatory = false;}
			this.question = xml.textContent;
		};
		
		this.id = xml.id;
		this.hostURL = xml.getAttribute('hostURL');
		this.sampleRate = xml.getAttribute('sampleRate');
		if (xml.getAttribute('randomiseOrder') == "true") {this.randomiseOrder = true;}
		else {this.randomiseOrder = false;}
		this.repeatCount = xml.getAttribute('repeatCount');
		if (xml.getAttribute('loop') == 'true') {this.loop = true;}
		else {this.loop == false;}
		if (xml.getAttribute('elementComments') == "true") {this.elementComments = true;}
		else {this.elementComments = false;}
		
		this.preTest = new parent.prepostNode('pretest',xml.getElementsByTagName('PreTest'));
		this.postTest = new parent.prepostNode('posttest',xml.getElementsByTagName('PostTest'));
		
		this.interfaces = [];
		var interfaceDOM = xml.getElementsByTagName('interface');
		for (var i=0; i<interfaceDOM.length; i++) {
			this.interfaces.push(new this.interfaceNode(interfaceDOM[i]));
		}
		
		this.commentBoxPrefix = xml.getElementsByTagName('commentBoxPrefix');
		if (this.commentBoxPrefix.length != 0) {
			this.commentBoxPrefix = this.commentBoxPrefix[0].textContent;
		} else {
			this.commentBoxPrefix = "Comment on track";
		}
		
		this.audioElements  =[];
		var audioElementsDOM = xml.getElementsByTagName('audioElements');
		for (var i=0; i<audioElementsDOM.length; i++) {
			this.audioElements.push(new this.audioElementNode(this,audioElementsDOM[i]));
		}
		
		this.commentQuestions = [];
		var commentQuestionsDOM = xml.getElementsByTagName('CommentQuestion');
		for (var i=0; i<commentQuestionsDOM.length; i++) {
			this.commentQuestions.push(new this.commentQuestionNode(commentQuestionsDOM[i]));
		}
	};
}

function Interface(specificationObject) {
	// This handles the bindings between the interface and the audioEngineContext;
	this.specification = specificationObject;
	this.insertPoint = document.getElementById("topLevelBody");
	
	// Bounded by interface!!
	// Interface object MUST have an exportXMLDOM method which returns the various DOM levels
	// For example, APE returns  the slider position normalised in a <value> tag.
	this.interfaceObjects = [];
	this.interfaceObject = function(){};
	
	this.commentBoxes = [];
	this.commentBox = function(audioObject) {
		var element = audioObject.specification;
		this.audioObject = audioObject;
		this.id = audioObject.id;
		var audioHolderObject = audioObject.specification.parent;
		// Create document objects to hold the comment boxes
		this.trackComment = document.createElement('div');
		this.trackComment.className = 'comment-div';
		this.trackComment.id = 'comment-div-'+audioObject.id;
		// Create a string next to each comment asking for a comment
		this.trackString = document.createElement('span');
		this.trackString.innerHTML = audioHolderObject.commentBoxPrefix+' '+audioObject.id;
		// Create the HTML5 comment box 'textarea'
		this.trackCommentBox = document.createElement('textarea');
		this.trackCommentBox.rows = '4';
		this.trackCommentBox.cols = '100';
		this.trackCommentBox.name = 'trackComment'+audioObject.id;
		this.trackCommentBox.className = 'trackComment';
		var br = document.createElement('br');
		// Add to the holder.
		this.trackComment.appendChild(this.trackString);
		this.trackComment.appendChild(br);
		this.trackComment.appendChild(this.trackCommentBox);
		
		this.exportXMLDOM = function() {
			var root = document.createElement('comment');
			if (this.audioObject.specification.parent.elementComments) {
				var question = document.createElement('question');
				question.textContent = this.trackString.textContent;
				var response = document.createElement('response');
				response.textContent = this.trackCommentBox.value;
				root.appendChild(question);
				root.appendChild(response);
			}
			return root;
		};
	};
	
	this.createCommentBox = function(audioObject) {
		var node = new this.commentBox(audioObject);
		this.commentBoxes.push(node);
		audioObject.commentDOM = node;
		return node;
	};
	
	this.sortCommentBoxes = function() {
		var holder = [];
		while (this.commentBoxes.length > 0) {
			var node = this.commentBoxes.pop(0);
			holder[node.id] = node;
		}
		this.commentBoxes = holder;
	};
	
	this.showCommentBoxes = function(inject, sort) {
		if (sort) {interfaceContext.sortCommentBoxes();}
		for (var i=0; i<interfaceContext.commentBoxes.length; i++) {
			inject.appendChild(this.commentBoxes[i].trackComment);
		}
	};
}


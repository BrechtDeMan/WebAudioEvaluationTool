/**
 * core.js
 * 
 * Main script to run, calls all other core functions and manages loading/store to backend.
 * Also contains all global variables.
 */

/* create the web audio API context and store in audioContext*/
var audioContext; // Hold the browser web audio API
var projectXML; // Hold the parsed setup XML
var popup; // Hold the interfacePopup object
var testState;
var currentState; // Keep track of the current state (pre/post test, which test, final test? first test?)
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
		insertPoint.appendChild(this.popup);
		insertPoint.appendChild(blank);
	};
	
	this.showPopup = function(){
		if (this.popup == null || this.popup == undefined) {
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
		if (node.nodeName == 'statement') {
			var span = document.createElement('span');
			span.textContent = node.textContent;
			this.popupContent.appendChild(span);
		} else if (node.nodeName == 'question') {
			var span = document.createElement('span');
			span.textContent = node.textContent;
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
		this.popupOptions = $(node).children();
		if (this.popupOptions.length > 0) {
			if (node.nodeName == 'preTest' || node.nodeName == 'PreTest') {
				this.responses = document.createElement('PreTest');
			} else if (node.nodeName == 'postTest' || node.nodeName == 'PostTest') {
				this.responses = document.createElement('PostTest');
			} else {
				console.log ('WARNING - popup node neither pre or post!');
				this.responses = document.createElement('responses');
			}
			this.currentIndex = 0;
			this.showPopup();
			this.postNode();
		}
	};
	
	this.buttonClicked = function() {
		// Each time the popup button is clicked!
		var node = this.popupOptions[this.currentIndex];
		if (node.nodeName == 'question') {
			// Must extract the question data
			var mandatory = node.attributes['mandatory'];
			if (mandatory == undefined) {
				mandatory = false;
			} else {
				if (mandatory.value == 'true'){mandatory = true;}
				else {mandatory = false;}
			}
			var textArea = $(popup.popupContent).find('textarea')[0];
			if (mandatory == true && textArea.value.length == 0) {
				alert('This question is mandatory');
				return;
			} else {
				// Save the text content
				var hold = document.createElement('comment');
				hold.id = node.attributes['id'].value;
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
				var name = this.stateMap[id].nodeName;
				var obj = document.createElement(name);
				if (name == "audioHolder") {
					obj.id = this.stateMap[id].id;
				}
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
			if (this.currentStateMap.nodeName == "audioHolder") {
				// Save current page
				this.testPageCompleted(this.stateResults[this.stateIndex],this.currentStateMap,this.currentTestId);
				this.currentTestId++;
			}
			this.stateIndex++;
			if (this.stateIndex >= this.stateMap.length) {
				console.log('Test Completed');
				createProjectSave(projectReturn);
			} else {
				this.currentStateMap = this.stateMap[this.stateIndex];
				if (this.currentStateMap.nodeName == "audioHolder") {
					console.log('Loading test page');
					loadTest(this.currentStateMap);
					this.initialiseInnerState(this.currentStateMap);
				} else if (this.currentStateMap.nodeName == "PreTest" || this.currentStateMap.nodeName == "PostTest") {
					if (this.currentStateMap.childElementCount >= 1) {
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
		
		pageXMLSave(store, testXML, testId);
	}
	
	this.initialiseInnerState = function(testXML) {
		// Parses the received testXML for pre and post test options
		this.currentStateMap = [];
		var preTest = $(testXML).find('PreTest')[0];
		var postTest = $(testXML).find('PostTest')[0];
		if (preTest == undefined) {preTest = document.createElement("preTest");}
		if (postTest == undefined){postTest= document.createElement("postTest");}
		this.currentStateMap.push(preTest);
		this.currentStateMap.push(testXML);
		this.currentStateMap.push(postTest);
		this.currentIndex = -1;
		this.advanceInnerState();
	}
	
	this.advanceInnerState = function() {
		this.currentIndex++;
		if (this.currentIndex >= this.currentStateMap.length) {
			this.currentIndex = null;
			this.currentStateMap = this.stateMap[this.stateIndex];
			this.advanceState();
		} else {
			if (this.currentStateMap[this.currentIndex].nodeName == "audioHolder") {
				console.log("Loading test page"+this.currentTestId);
			} else if (this.currentStateMap[this.currentIndex].nodeName == "PreTest") {
				popup.initState(this.currentStateMap[this.currentIndex]);
			} else if (this.currentStateMap[this.currentIndex].nodeName == "PostTest") {
				popup.initState(this.currentStateMap[this.currentIndex]);
			} else {
				this.advanceInnerState();
			}
		}
	}
	
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
		
		var submitDiv = document.getElementById('download-point');
		submitDiv.appendChild(a);
		popup.showPopup();
		popup.popupContent.innerHTML = null;
		popup.popupContent.appendChild(submitDiv)
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
	return submitDiv;
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
	
	
	this.newTrack = function(url) {
		// Pull data from given URL into new audio buffer
		// URLs must either be from the same source OR be setup to 'Access-Control-Allow-Origin'
		
		// Create the audioObject with ID of the new track length;
		audioObjectId = this.audioObjects.length;
		this.audioObjects[audioObjectId] = new audioObject(audioObjectId);

		// AudioObject will get track itself.
		this.audioObjects[audioObjectId].constructTrack(url);
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
	
	this.id = id;
	this.state = 0; // 0 - no data, 1 - ready
	this.url = null; // Hold the URL given for the output back to the results.
	this.metric = new metricTracker(this);
	
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
	}
	
	this.loopStop = function() {
		if (this.outputGain.gain.value != 0.0) {
			this.outputGain.gain.value = 0.0;
			this.metric.stopListening(audioEngineContext.timer.getTestTime());
		}
	}
	
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
		var span = document.createElement("span");
		span.textContent = "Please wait! Elements still loading";
		hold.appendChild(span);
		var body = document.getElementsByTagName('body')[0];
		body.appendChild(hold);
		testWaitTimerIntervalHolder = setInterval(function(){
			var ready = audioEngineContext.checkAllReady();
			if (ready) {
				var elem = document.getElementById('testWaitIndicator');
				var body = document.getElementsByTagName('body')[0];
				body.removeChild(elem);
				clearInterval(testWaitTimerIntervalHolder);
			}
		},500,false);
	}
}

var testWaitTimerIntervalHolder = null;

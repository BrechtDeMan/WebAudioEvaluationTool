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
	this.buttonProceed = null;
	this.buttonPrevious = null;
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
		
		this.buttonProceed = document.createElement('button');
		this.buttonProceed.className = 'popupButton';
		this.buttonProceed.style.left = '440px';
		this.buttonProceed.style.top = '215px';
		this.buttonProceed.innerHTML = 'Next';
		this.buttonProceed.onclick = function(){popup.proceedClicked();};
		
		this.buttonPrevious = document.createElement('button');
		this.buttonPrevious.className = 'popupButton';
		this.buttonPrevious.style.left = '10px';
		this.buttonPrevious.style.top = '215px';
		this.buttonPrevious.innerHTML = 'Back';
		this.buttonPrevious.onclick = function(){popup.previousClick();};
		
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
		$(window).keypress(function(e){
			if (e.keyCode == 13 && popup.popup.style.visibility == 'visible')
			{
				// Enter key pressed
				var textarea = $(popup.popupContent).find('textarea');
				if (textarea.length != 0)
				{
					if (textarea[0] == document.activeElement)
					{return;}
				}
				popup.buttonProceed.onclick();
			}
		});
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
			switch (node.boxsize) {
			case 'small':
				textArea.cols = "20";
				textArea.rows = "1";
				break;
			case 'normal':
				textArea.cols = "30";
				textArea.rows = "2";
				break;
			case 'large':
				textArea.cols = "40";
				textArea.rows = "5";
				break;
			case 'huge':
				textArea.cols = "50";
				textArea.rows = "10";
				break;
			}
			var br = document.createElement('br');
			this.popupContent.appendChild(span);
			this.popupContent.appendChild(br);
			this.popupContent.appendChild(textArea);
			this.popupContent.childNodes[2].focus();
		} else if (node.type == 'checkbox') {
			var span = document.createElement('span');
			span.textContent = node.statement;
			this.popupContent.appendChild(span);
			var optHold = document.createElement('div');
			optHold.id = 'option-holder';
			optHold.align = 'left';
			for (var i=0; i<node.options.length; i++) {
				var option = node.options[i];
				var input = document.createElement('input');
				input.id = option.id;
				input.type = 'checkbox';
				var span = document.createElement('span');
				span.textContent = option.text;
				var hold = document.createElement('div');
				hold.setAttribute('name','option');
				hold.style.float = 'left';
				hold.style.padding = '4px';
				hold.appendChild(input);
				hold.appendChild(span);
				optHold.appendChild(hold);
			}
			this.popupContent.appendChild(optHold);
		} else if (node.type == 'radio') {
			var span = document.createElement('span');
			span.textContent = node.statement;
			this.popupContent.appendChild(span);
			var optHold = document.createElement('div');
			optHold.id = 'option-holder';
			optHold.align = 'none';
			optHold.style.float = 'left';
			optHold.style.width = "100%";
			for (var i=0; i<node.options.length; i++) {
				var option = node.options[i];
				var input = document.createElement('input');
				input.id = option.name;
				input.type = 'radio';
				input.name = node.id;
				var span = document.createElement('span');
				span.textContent = option.text;
				var hold = document.createElement('div');
				hold.setAttribute('name','option');
				hold.style.padding = '4px';
				hold.appendChild(input);
				hold.appendChild(span);
				optHold.appendChild(hold);
			}
			this.popupContent.appendChild(optHold);
		} else if (node.type == 'number') {
			var span = document.createElement('span');
			span.textContent = node.statement;
			this.popupContent.appendChild(span);
			this.popupContent.appendChild(document.createElement('br'));
			var input = document.createElement('input');
			input.type = 'textarea';
			if (node.min != null) {input.min = node.min;}
			if (node.max != null) {input.max = node.max;}
			if (node.step != null) {input.step = node.step;}
			this.popupContent.appendChild(input);
		}
		this.popupContent.appendChild(this.buttonProceed);
		if(this.currentIndex+1 == this.popupOptions.length) {
			if (this.responses.nodeName == "PRETEST") {
				this.buttonProceed.textContent = 'Start';
			} else {
				this.buttonProceed.textContent = 'Submit';
			}
		} else {
			this.buttonProceed.textContent = 'Next';
		}
		if(this.currentIndex > 0)
			this.popupContent.appendChild(this.buttonPrevious);
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
	
	this.proceedClicked = function() {
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
				console.log("Question: "+ node.question);
				console.log("Question Response: "+ textArea.value);
				this.responses.appendChild(hold);
			}
		} else if (node.type == 'checkbox') {
			// Must extract checkbox data
			var optHold = document.getElementById('option-holder');
			var hold = document.createElement('checkbox');
			console.log("Checkbox: "+ node.statement);
			hold.id = node.id;
			for (var i=0; i<optHold.childElementCount; i++) {
				var input = optHold.childNodes[i].getElementsByTagName('input')[0];
				var statement = optHold.childNodes[i].getElementsByTagName('span')[0];
				var response = document.createElement('option');
				response.setAttribute('name',input.id);
				response.textContent = input.checked;
				hold.appendChild(response);
				console.log(input.id +': '+ input.checked);
			}
			this.responses.appendChild(hold);
		} else if (node.type == "radio") {
			var optHold = document.getElementById('option-holder');
			var hold = document.createElement('radio');
			var responseID = null;
			var i=0;
			while(responseID == null) {
				var input = optHold.childNodes[i].getElementsByTagName('input')[0];
				if (input.checked == true) {
					responseID = i;
				}
				i++;
			}
			hold.id = node.id;
			hold.setAttribute('name',node.options[responseID].name);
			hold.textContent = node.options[responseID].text;
			this.responses.appendChild(hold);
		} else if (node.type == "number") {
			var input = this.popupContent.getElementsByTagName('input')[0];
			if (node.mandatory == true && input.value.length == 0) {
				alert('This question is mandatory. Please enter a number');
				return;
			}
			var enteredNumber = Number(input.value);
			if (isNaN(enteredNumber)) {
				alert('Please enter a valid number');
				return;
			}
			if (enteredNumber < node.min && node.min != null) {
				alert('Number is below the minimum value of '+node.min);
				return;
			}
			if (enteredNumber > node.max && node.max != null) {
				alert('Number is above the maximum value of '+node.max);
				return;
			}
			var hold = document.createElement('number');
			hold.id = node.id;
			hold.textContent = input.value;
			this.responses.appendChild(hold);
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
	
	this.previousClick = function() {
		// Triggered when the 'Back' button is clicked in the survey
		if (this.currentIndex > 0) {
			this.currentIndex--;
			var node = this.popupOptions[this.currentIndex];
			if (node.type != 'statement') {
				var prevResp = this.responses.childNodes[this.responses.childElementCount-1];
				this.responses.removeChild(prevResp);
			}
			this.postNode();
			if (node.type == 'question') {
				this.popupContent.getElementsByTagName('textarea')[0].value = prevResp.textContent;
			} else if (node.type == 'checkbox') {
				var options = this.popupContent.getElementsByTagName('input');
				var savedOptions = prevResp.getElementsByTagName('option');
				for (var i=0; i<options.length; i++) {
					var id = options[i].id;
					for (var j=0; j<savedOptions.length; j++) {
						if (savedOptions[j].getAttribute('name') == id) {
							if (savedOptions[j].textContent == 'true') {options[i].checked = true;}
							else {options[i].checked = false;}
							break;
						}
					}
				}
			} else if (node.type == 'number') {
				this.popupContent.getElementsByTagName('input')[0].value = prevResp.textContent;
			} else if (node.type == 'radio') {
				var options = this.popupContent.getElementsByTagName('input');
				var name = prevResp.getAttribute('name');
				for (var i=0; i<options.length; i++) {
					if (options[i].id == name) {
						options[i].checked = true;
						break;
					}
				}
			}
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
			var aH_pId = 0;
			for (var id=0; id<this.stateMap.length; id++){
				var name = this.stateMap[id].type;
				var obj = document.createElement(name);
				if (name == 'audioHolder') {
					obj.id = this.stateMap[id].id;
					obj.setAttribute('presentedid',aH_pId);
					aH_pId+=1;
				}
				this.stateResults.push(obj);
			}
		} else {
			console.log('FATAL - StateMap not correctly constructed. EMPTY_STATE_MAP');
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
	} else if (specification.interfaceType == "MUSHRA")
	{
		interfaceJS.setAttribute("src","mushra.js");
		
		// MUSHRA comes with a css file
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.href = 'mushra.css';
		
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
			} else {
				popup.showPopup();
				popup.popupContent.innerHTML = null;
				popup.popupContent.textContent = "Thank you for performing this listening test";
			}
		};
		xmlhttp.send(file);
	}
}

function errorSessionDump(msg){
	// Create the partial interface XML save
	// Include error node with message on why the dump occured
	var xmlDoc = interfaceXMLSave();
	var err = document.createElement('error');
	err.textContent = msg;
	xmlDoc.appendChild(err);
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
	
	popup.showPopup();
	popup.popupContent.innerHTML = "ERROR : "+msg;
	popup.popupContent.appendChild(a);
}

// Only other global function which must be defined in the interface class. Determines how to create the XML document.
function interfaceXMLSave(){
	// Create the XML string to be exported with results
	var xmlDoc = document.createElement("BrowserEvaluationResult");
	var projectDocument = specification.projectXML;
	projectDocument.setAttribute('file-name',url);
	xmlDoc.appendChild(projectDocument);
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
	
	this.play = function(id) {
		// Start the timer and set the audioEngine state to playing (1)
		if (this.status == 0 && this.loopPlayback) {
			// Check if all audioObjects are ready
			if(this.checkAllReady())
			{
				this.status = 1;
				this.setSynchronousLoop();
			}
		}
		else
		{
			this.status = 1;
		}
		if (this.status== 1) {
			this.timer.startTest();
			if (id == undefined) {
				id = -1;
				console.log('FATAL - Passed id was undefined - AudioEngineContext.play(id)');
				return;
			} else {
				interfaceContext.playhead.setTimePerPixel(this.audioObjects[id]);
			}
			if (this.loopPlayback) {
				for (var i=0; i<this.audioObjects.length; i++)
				{
					this.audioObjects[i].play(this.timer.getTestTime()+1);
					if (id == i) {
						this.audioObjects[i].loopStart();
					} else {
						this.audioObjects[i].loopStop();
					}
				}
			} else {
				for (var i=0; i<this.audioObjects.length; i++)
				{
					if (i != id) {
						this.audioObjects[i].outputGain.gain.value = 0.0;
						this.audioObjects[i].stop();
					} else if (i == id) {
						this.audioObjects[id].outputGain.gain.value = 1.0;
						this.audioObjects[id].play(audioContext.currentTime+0.01);
					}
				}
			}
			interfaceContext.playhead.start();
		}
	};
	
	this.stop = function() {
		// Send stop and reset command to all playback buffers and set audioEngine state to stopped (1)
		if (this.status == 1) {
			for (var i=0; i<this.audioObjects.length; i++)
			{
				this.audioObjects[i].stop();
			}
			interfaceContext.playhead.stop();
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
	
	this.setSynchronousLoop = function() {
		// Pads the signals so they are all exactly the same length
		var length = 0;
		var lens = [];
		var maxId;
		for (var i=0; i<this.audioObjects.length; i++)
		{
			lens.push(this.audioObjects[i].buffer.length);
			if (length < this.audioObjects[i].buffer.length)
			{
				length = this.audioObjects[i].buffer.length;
				maxId = i;
			}
		}
		// Perform difference
		for (var i=0; i<lens.length; i++)
		{
			lens[i] = length - lens[i];
		}
		// Extract the audio and zero-pad
		for (var i=0; i<lens.length; i++)
		{
			var orig = this.audioObjects[i].buffer;
			var hold = audioContext.createBuffer(orig.numberOfChannels,length,orig.sampleRate);
			for (var c=0; c<orig.numberOfChannels; c++)
			{
				var inData = hold.getChannelData(c);
				var outData = orig.getChannelData(c);
				for (var n=0; n<orig.length; n++)
				{inData[n] = outData[n];}
			}
			this.audioObjects[i].buffer = hold;
			delete orig;
		}
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
		if (this.bufferNode == undefined) {
			this.bufferNode = audioContext.createBufferSource();
			this.bufferNode.owner = this;
			this.bufferNode.connect(this.outputGain);
			this.bufferNode.buffer = this.buffer;
			this.bufferNode.loop = audioEngineContext.loopPlayback;
			this.bufferNode.onended = function(event) {
				// Safari does not like using 'this' to reference the calling object!
				event.currentTarget.owner.metric.stopListening(audioEngineContext.timer.getTestTime(),event.currentTarget.owner.getCurrentPosition());
			};
			if (this.bufferNode.loop == false) {
				this.metric.startListening(audioEngineContext.timer.getTestTime());
			}
			this.bufferNode.start(startTime);
		}
	};
	
	this.stop = function() {
		if (this.bufferNode != undefined)
		{
			this.metric.stopListening(audioEngineContext.timer.getTestTime(),this.getCurrentPosition());
			this.bufferNode.stop(0);
			this.bufferNode = undefined;
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
				if (audioObj.specification.type != 'outsidereference')
					{audioObj.interfaceDOM.enable();}
			}, function(){
				// Should only be called if there was an error, but sometimes gets called continuously
				// Check here if the error is genuine
				if (audioObj.state == 0 || audioObj.buffer == undefined) {
					// Genuine error
					console.log('FATAL - Error loading buffer on '+audioObj.id);
					if (request.status == 404)
					{
						console.log('FATAL - Fragment '+audioObj.id+' 404 error');
						console.log('URL: '+audioObj.url);
						errorSessionDump('Fragment '+audioObj.id+' 404 error');
					}
				}
			});
		};
		request.send();
	};
	
	this.exportXMLDOM = function() {
		var root = document.createElement('audioElement');
		root.id = this.specification.id;
		root.setAttribute('url',this.url);
		var file = document.createElement('file');
		file.setAttribute('sampleRate',this.buffer.sampleRate);
		file.setAttribute('channels',this.buffer.numberOfChannels);
		file.setAttribute('sampleCount',this.buffer.length);
		file.setAttribute('duration',this.buffer.duration);
		root.appendChild(file);
		if (this.specification.type != 'outsidereference') {
			root.appendChild(this.interfaceDOM.exportXMLDOM(this));
			root.appendChild(this.commentDOM.exportXMLDOM(this));
			if(this.specification.type == 'anchor') {
				root.setAttribute('anchor',true);
			} else if(this.specification.type == 'reference') {
				root.setAttribute('reference',true);
			}
		}
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
	
	this.stopListening = function(time,bufferStopTime)
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
			if (bufferStopTime == undefined) {
				bufferTime.setAttribute('stop',this.parent.getCurrentPosition());
			} else {
				bufferTime.setAttribute('stop',bufferStopTime);
			}
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
	
	var inputSequence = []; // For safety purposes: keep track of randomisation
	for (var counter = 0; counter < N; ++counter) 
		inputSequence.push(counter) // Fill array
	var inputSequenceClone = inputSequence.slice(0);
	
	var holdArr = [];
	var outputSequence = [];
	for (var n=0; n<N; n++)
	{
		// First pick a random number
		var r = Math.random();
		// Multiply and floor by the number of elements left
		r = Math.floor(r*input.length);
		// Pick out that element and delete from the array
		holdArr.push(input.splice(r,1)[0]);
		// Do the same with sequence
		outputSequence.push(inputSequence.splice(r,1)[0]);
	}
	console.log(inputSequenceClone.toString()); // print original array to console
	console.log(outputSequence.toString()); 	// print randomised array to console
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
	this.commonInterface;
	this.projectReturn;
	this.randomiseOrder;
	this.collectMetrics;
	this.testPages;
	this.preTest;
	this.postTest;
	this.metrics =[];
	
	this.audioHolders = [];
	
	this.decode = function() {
		// projectXML - DOM Parsed document
		this.projectXML = projectXML.childNodes[0];
		var setupNode = projectXML.getElementsByTagName('setup')[0];
		this.interfaceType = setupNode.getAttribute('interface');
		this.projectReturn = setupNode.getAttribute('projectReturn');
		this.testPages = setupNode.getAttribute('testPages');
		if (setupNode.getAttribute('randomiseOrder') == "true") {
			this.randomiseOrder = true;
		} else {this.randomiseOrder = false;}
		if (setupNode.getAttribute('collectMetrics') == "true") {
			this.collectMetrics = true;
		} else {this.collectMetrics = false;}
		if (isNaN(Number(this.testPages)) || this.testPages == undefined)
		{
			this.testPages = null;
		} else {
			this.testPages = Number(this.testPages);
			if (this.testPages == 0) {this.testPages = null;}
		}
		var metricCollection = setupNode.getElementsByTagName('Metric');
		
		this.preTest = new this.prepostNode('pretest',setupNode.getElementsByTagName('PreTest'));
		this.postTest = new this.prepostNode('posttest',setupNode.getElementsByTagName('PostTest'));
		
		if (metricCollection.length > 0) {
			metricCollection = metricCollection[0].getElementsByTagName('metricEnable');
			for (var i=0; i<metricCollection.length; i++) {
				this.metrics.push(new this.metricNode(metricCollection[i].textContent));
			}
		}
		
		var commonInterfaceNode = setupNode.getElementsByTagName('interface');
		if (commonInterfaceNode.length > 0) {
			commonInterfaceNode = commonInterfaceNode[0];
		} else {
			commonInterfaceNode = undefined;
		}
		
		this.commonInterface = new function() {
			this.OptionNode = function(child) {
				this.type = child.nodeName;
				if (this.type == 'option')
				{
					this.name = child.getAttribute('name');
				}
				else if (this.type == 'check') {
					this.check = child.getAttribute('name');
					if (this.check == 'scalerange') {
						this.min = child.getAttribute('min');
						this.max = child.getAttribute('max');
						if (this.min == null) {this.min = 1;}
						else if (Number(this.min) > 1 && this.min != null) {
							this.min = Number(this.min)/100;
						} else {
							this.min = Number(this.min);
						}
						if (this.max == null) {this.max = 0;}
						else if (Number(this.max) > 1 && this.max != null) {
							this.max = Number(this.max)/100;
						} else {
							this.max = Number(this.max);
						}
					}
				} else if (this.type == 'anchor' || this.type == 'reference') {
					this.value = Number(child.textContent);
					this.enforce = child.getAttribute('enforce');
					if (this.enforce == 'true') {this.enforce = true;}
					else {this.enforce = false;}
				}
			};
			this.options = [];
			if (commonInterfaceNode != undefined) {
				var child = commonInterfaceNode.firstElementChild;
				while (child != undefined) {
					this.options.push(new this.OptionNode(child));
					child = child.nextElementSibling;
				}
			}
		};
		
		var audioHolders = projectXML.getElementsByTagName('audioHolder');
		for (var i=0; i<audioHolders.length; i++) {
			this.audioHolders.push(new this.audioHolderNode(this,audioHolders[i]));
		}
		
		// New check if we need to randomise the test order
		if (this.randomiseOrder)
		{
	 		this.audioHolders = randomiseOrder(this.audioHolders);
	 		for (var i=0; i<this.audioHolders.length; i++)
	 		{
	 			this.audioHolders[i].presentedId = i;
	 		}
		}
		
		if (this.testPages != null || this.testPages != undefined)
		{
			if (this.testPages > audioHolders.length)
			{
				console.log('Warning: You have specified '+audioHolders.length+' tests but requested '+this.testPages+' be completed!');
				this.testPages = audioHolders.length;
			}
			var aH = this.audioHolders;
			this.audioHolders = [];
			for (var i=0; i<this.testPages; i++)
			{
				this.audioHolders.push(aH[i]);
			}
		}
	};
	
	this.prepostNode = function(type,Collection) {
		this.type = type;
		this.options = [];
		
		this.OptionNode = function(child) {
			
			this.childOption = function(element) {
				this.type = 'option';
				this.id = element.id;
				this.name = element.getAttribute('name');
				this.text = element.textContent;
			};
			
			this.type = child.nodeName;
			if (child.nodeName == "question") {
				this.id = child.id;
				this.mandatory;
				if (child.getAttribute('mandatory') == "true") {this.mandatory = true;}
				else {this.mandatory = false;}
				this.question = child.textContent;
				if (child.getAttribute('boxsize') == null) {
					this.boxsize = 'normal';
				} else {
					this.boxsize = child.getAttribute('boxsize');
				}
			} else if (child.nodeName == "statement") {
				this.statement = child.textContent;
			} else if (child.nodeName == "checkbox" || child.nodeName == "radio") {
				var element = child.firstElementChild;
				this.id = child.id;
				if (element == null) {
					console.log('Malformed' +child.nodeName+ 'entry');
					this.statement = 'Malformed' +child.nodeName+ 'entry';
					this.type = 'statement';
				} else {
					this.options = [];
					while (element != null) {
						if (element.nodeName == 'statement' && this.statement == undefined){
							this.statement = element.textContent;
						} else if (element.nodeName == 'option') {
							this.options.push(new this.childOption(element));
						}
						element = element.nextElementSibling;
					}
				}
			} else if (child.nodeName == "number") {
				this.statement = child.textContent;
				this.id = child.id;
				this.min = child.getAttribute('min');
				this.max = child.getAttribute('max');
				this.step = child.getAttribute('step');
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
		this.presentedId = parent.audioHolders.length;
		this.interfaceNode = function(DOM) {
			var title = DOM.getElementsByTagName('title');
			if (title.length == 0) {this.title = null;}
			else {this.title = title[0].textContent;}
			this.options = parent.commonInterface.options;
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
			this.type = xml.getAttribute('type');
			if (this.type == null) {this.type = "normal";}
			if (this.type == 'anchor') {this.anchor = true;}
			else {this.anchor = false;}
			if (this.type == 'reference') {this.reference = true;}
			else {this.reference = false;}
			
			this.marker = xml.getAttribute('marker');
			if (this.marker == null) {this.marker = undefined;}
			
			if (this.anchor == true) {
				if (this.marker != undefined) {this.enforce = true;}
				else {this.enforce = enforceAnchor;}
				this.marker = anchor;
			}
			else if (this.reference == true) {
				if (this.marker != undefined) {this.enforce = true;}
				else {this.enforce = enforceReference;}
				this.marker = reference;
			}
			
			if (this.marker != undefined) {
				this.marker = Number(this.marker);
				if (this.marker > 1) {this.marker /= 100;}
			}
		};
		
		this.commentQuestionNode = function(xml) {
			this.childOption = function(element) {
				this.type = 'option';
				this.name = element.getAttribute('name');
				this.text = element.textContent;
			};
			this.id = xml.id;
			if (xml.getAttribute('mandatory') == 'true') {this.mandatory = true;}
			else {this.mandatory = false;}
			this.type = xml.getAttribute('type');
			if (this.type == undefined) {this.type = 'text';}
			switch (this.type) {
			case 'text':
				this.question = xml.textContent;
				break;
			case 'radio':
				var child = xml.firstElementChild;
				this.options = [];
				while (child != undefined) {
					if (child.nodeName == 'statement' && this.statement == undefined) {
						this.statement = child.textContent;
					} else if (child.nodeName == 'option') {
						this.options.push(new this.childOption(child));
					}
					child = child.nextElementSibling;
				}
				break;
			case 'checkbox':
				var child = xml.firstElementChild;
				this.options = [];
				while (child != undefined) {
					if (child.nodeName == 'statement' && this.statement == undefined) {
						this.statement = child.textContent;
					} else if (child.nodeName == 'option') {
						this.options.push(new this.childOption(child));
					}
					child = child.nextElementSibling;
				}
				break;
			}
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
		
		var anchor = xml.getElementsByTagName('anchor');
		var enforceAnchor = false;
		if (anchor.length == 0) {
			// Find anchor in commonInterface;
			for (var i=0; i<parent.commonInterface.options.length; i++) {
				if(parent.commonInterface.options[i].type == 'anchor') {
					anchor = parent.commonInterface.options[i].value;
					enforceAnchor = parent.commonInterface.options[i].enforce;
					break;
				}
			}
			if (typeof(anchor) == "object") {
				anchor = null;
			}
		} else {
			anchor = anchor[0].textContent;
		}
		
		var reference = xml.getElementsByTagName('anchor');
		var enforceReference = false;
		if (reference.length == 0) {
			// Find anchor in commonInterface;
			for (var i=0; i<parent.commonInterface.options.length; i++) {
				if(parent.commonInterface.options[i].type == 'reference') {
					reference = parent.commonInterface.options[i].value;
					enforceReference = parent.commonInterface.options[i].enforce;
					break;
				}
			}
			if (typeof(reference) == "object") {
				reference = null;
			}
		} else {
			reference = reference[0].textContent;
		}
		
		if (typeof(anchor) == 'number') {
			if (anchor > 1 && anchor < 100) {anchor /= 100.0;}
		}
		
		if (typeof(reference) == 'number') {
			if (reference > 1 && reference < 100) {reference /= 100.0;}
		}
		
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
		this.outsideReference = null;
		for (var i=0; i<audioElementsDOM.length; i++) {
			if (audioElementsDOM[i].getAttribute('type') == 'outsidereference') {
				if (this.outsideReference == null) {
					this.outsideReference = new this.audioElementNode(this,audioElementsDOM[i]);
				} else {
					console.log('Error only one audioelement can be of type outsidereference per audioholder');
					this.audioElements.push(new this.audioElementNode(this,audioElementsDOM[i]));
					console.log('Element id '+audioElementsDOM[i].id+' made into normal node');
				}
			} else {
				this.audioElements.push(new this.audioElementNode(this,audioElementsDOM[i]));
			}
		}
		
		if (this.randomiseOrder) {
			this.audioElements = randomiseOrder(this.audioElements);
		}
		
		// Check only one anchor and one reference per audioNode
		var anchor = [];
		var reference = [];
		this.anchorId = null;
		this.referenceId = null;
		for (var i=0; i<this.audioElements.length; i++)
		{
			if (this.audioElements[i].anchor == true) {anchor.push(i);}
			if (this.audioElements[i].reference == true) {reference.push(i);}
		}
		
		if (anchor.length > 1) {
			console.log('Error - cannot have more than one anchor!');
			console.log('Each anchor node will be a normal mode to continue the test');
			for (var i=0; i<anchor.length; i++)
			{
				this.audioElements[anchor[i]].anchor = false;
				this.audioElements[anchor[i]].value = undefined;
			}
		} else {this.anchorId = anchor[0];}
		if (reference.length > 1) {
			console.log('Error - cannot have more than one anchor!');
			console.log('Each anchor node will be a normal mode to continue the test');
			for (var i=0; i<reference.length; i++)
			{
				this.audioElements[reference[i]].reference = false;
				this.audioElements[reference[i]].value = undefined;
			}
		} else {this.referenceId = reference[0];}
		
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
	this.elementCommentBox = function(audioObject) {
		var element = audioObject.specification;
		this.audioObject = audioObject;
		this.id = audioObject.id;
		var audioHolderObject = audioObject.specification.parent;
		// Create document objects to hold the comment boxes
		this.trackComment = document.createElement('div');
		this.trackComment.className = 'comment-div';
		this.trackComment.id = 'comment-div-'+audioObject.id;
		var boxwidth = (window.innerWidth-100)/2;
		if (boxwidth >= 624)
		{
			boxwidth = 624;
		}
		else if (boxwidth < 400)
		{
			boxwidth = 400;
		}
		this.trackComment.style.width = boxwidth+"px";
		// Create a string next to each comment asking for a comment
		this.trackString = document.createElement('span');
		this.trackString.innerHTML = audioHolderObject.commentBoxPrefix+' '+audioObject.id;
		// Create the HTML5 comment box 'textarea'
		this.trackCommentBox = document.createElement('textarea');
		this.trackCommentBox.rows = '4';
		this.trackCommentBox.cols = '100';
		this.trackCommentBox.name = 'trackComment'+audioObject.id;
		this.trackCommentBox.className = 'trackComment';
		this.trackCommentBox.style.width = boxwidth-6+"px";
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
				console.log("Comment frag-"+this.id+": "+response.textContent);
				root.appendChild(question);
				root.appendChild(response);
			}
			return root;
		};
	};
	
	this.commentQuestions = [];
	
	this.commentBox = function(commentQuestion) {
		this.specification = commentQuestion;
		// Create document objects to hold the comment boxes
		this.holder = document.createElement('div');
		this.holder.className = 'comment-div';
		var boxwidth = (window.innerWidth-100)/2;
		if (boxwidth >= 624)
		{
			boxwidth = 624;
		}
		else if (boxwidth < 400)
		{
			boxwidth = 400;
		}
		this.holder.style.width = boxwidth+"px";
		// Create a string next to each comment asking for a comment
		this.string = document.createElement('span');
		this.string.innerHTML = commentQuestion.question;
		// Create the HTML5 comment box 'textarea'
		this.textArea = document.createElement('textarea');
		this.textArea.rows = '4';
		this.textArea.cols = '100';
		this.textArea.className = 'trackComment';
		this.textArea.style.width = boxwidth-6+"px";
		var br = document.createElement('br');
		// Add to the holder.
		this.holder.appendChild(this.string);
		this.holder.appendChild(br);
		this.holder.appendChild(this.textArea);
		
		this.exportXMLDOM = function() {
			var root = document.createElement('comment');
			root.id = this.specification.id;
			root.setAttribute('type',this.specification.type);
			root.textContent = this.textArea.value;
			console.log("Question: "+this.string.textContent);
			console.log("Response: "+root.textContent);
			return root;
		};
	};
	
	this.radioBox = function(commentQuestion) {
		this.specification = commentQuestion;
		// Create document objects to hold the comment boxes
		this.holder = document.createElement('div');
		this.holder.className = 'comment-div';
		var boxwidth = (window.innerWidth-100)/2;
		if (boxwidth >= 624)
		{
			boxwidth = 624;
		}
		else if (boxwidth < 400)
		{
			boxwidth = 400;
		}
		this.holder.style.width = boxwidth+"px";
		// Create a string next to each comment asking for a comment
		this.string = document.createElement('span');
		this.string.innerHTML = commentQuestion.statement;
		var br = document.createElement('br');
		// Add to the holder.
		this.holder.appendChild(this.string);
		this.holder.appendChild(br);
		this.options = [];
		this.inputs = document.createElement('div');
		this.span = document.createElement('div');
		this.inputs.align = 'center';
		this.inputs.style.marginLeft = '12px';
		this.span.style.marginLeft = '12px';
		this.span.align = 'center';
		this.span.style.marginTop = '15px';
		
		var optCount = commentQuestion.options.length;
		var spanMargin = Math.floor(((boxwidth-20-(optCount*80))/(optCount))/2)+'px';
		for (var i=0; i<optCount; i++)
		{
			var div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
			div.style.marginRight = spanMargin;
			div.style.marginLeft = spanMargin;
			var input = document.createElement('input');
			input.type = 'radio';
			input.name = commentQuestion.id;
			input.setAttribute('setvalue',commentQuestion.options[i].name);
			input.className = 'comment-radio';
			div.appendChild(input);
			this.inputs.appendChild(div);
			
			
			div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
			div.style.marginRight = spanMargin;
			div.style.marginLeft = spanMargin;
			div.align = 'center';
			var span = document.createElement('span');
			span.textContent = commentQuestion.options[i].text;
			span.className = 'comment-radio-span';
			div.appendChild(span);
			this.span.appendChild(div);
			this.options.push(input);
		}
		this.holder.appendChild(this.span);
		this.holder.appendChild(this.inputs);
		
		this.exportXMLDOM = function() {
			var root = document.createElement('comment');
			root.id = this.specification.id;
			root.setAttribute('type',this.specification.type);
			var question = document.createElement('question');
			question.textContent = this.string.textContent;
			var response = document.createElement('response');
			var i=0;
			while(this.options[i].checked == false) {
				i++;
				if (i >= this.options.length) {
					break;
				}
			}
			if (i >= this.options.length) {
				response.textContent = 'null';
			} else {
				response.textContent = this.options[i].getAttribute('setvalue');
				response.setAttribute('number',i);
			}
			console.log('Comment: '+question.textContent);
			console.log('Response: '+response.textContent);
			root.appendChild(question);
			root.appendChild(response);
			return root;
		};
	};
	
	this.checkboxBox = function(commentQuestion) {
		this.specification = commentQuestion;
		// Create document objects to hold the comment boxes
		this.holder = document.createElement('div');
		this.holder.className = 'comment-div';
		var boxwidth = (window.innerWidth-100)/2;
		if (boxwidth >= 624)
		{
			boxwidth = 624;
		}
		else if (boxwidth < 400)
		{
			boxwidth = 400;
		}
		this.holder.style.width = boxwidth+"px";
		// Create a string next to each comment asking for a comment
		this.string = document.createElement('span');
		this.string.innerHTML = commentQuestion.statement;
		var br = document.createElement('br');
		// Add to the holder.
		this.holder.appendChild(this.string);
		this.holder.appendChild(br);
		this.options = [];
		this.inputs = document.createElement('div');
		this.span = document.createElement('div');
		this.inputs.align = 'center';
		this.inputs.style.marginLeft = '12px';
		this.span.style.marginLeft = '12px';
		this.span.align = 'center';
		this.span.style.marginTop = '15px';
		
		var optCount = commentQuestion.options.length;
		var spanMargin = Math.floor(((boxwidth-20-(optCount*80))/(optCount))/2)+'px';
		for (var i=0; i<optCount; i++)
		{
			var div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
			div.style.marginRight = spanMargin;
			div.style.marginLeft = spanMargin;
			var input = document.createElement('input');
			input.type = 'checkbox';
			input.name = commentQuestion.id;
			input.setAttribute('setvalue',commentQuestion.options[i].name);
			input.className = 'comment-radio';
			div.appendChild(input);
			this.inputs.appendChild(div);
			
			
			div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
			div.style.marginRight = spanMargin;
			div.style.marginLeft = spanMargin;
			div.align = 'center';
			var span = document.createElement('span');
			span.textContent = commentQuestion.options[i].text;
			span.className = 'comment-radio-span';
			div.appendChild(span);
			this.span.appendChild(div);
			this.options.push(input);
		}
		this.holder.appendChild(this.span);
		this.holder.appendChild(this.inputs);
		
		this.exportXMLDOM = function() {
			var root = document.createElement('comment');
			root.id = this.specification.id;
			root.setAttribute('type',this.specification.type);
			var question = document.createElement('question');
			question.textContent = this.string.textContent;
			root.appendChild(question);
			console.log('Comment: '+question.textContent);
			for (var i=0; i<this.options.length; i++) {
				var response = document.createElement('response');
				response.textContent = this.options[i].checked;
				response.setAttribute('name',this.options[i].getAttribute('setvalue'));
				root.appendChild(response);
				console.log('Response '+response.getAttribute('name') +': '+response.textContent);
			}
			return root;
		};
	};

	this.createCommentBox = function(audioObject) {
		var node = new this.elementCommentBox(audioObject);
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
	
	this.deleteCommentBoxes = function() {
		this.commentBoxes = [];
	};
	
	this.createCommentQuestion = function(element) {
		var node;
		if (element.type == 'text') {
			node = new this.commentBox(element);
		} else if (element.type == 'radio') {
			node = new this.radioBox(element);
		} else if (element.type == 'checkbox') {
			node = new this.checkboxBox(element);
		}
		this.commentQuestions.push(node);
		return node;
	};
	
	this.deleteCommentQuestions = function()
	{
		this.commentQuestions = [];
	};
	
	this.playhead = new function()
	{
		this.object = document.createElement('div');
		this.object.className = 'playhead';
		this.object.align = 'left';
		var curTime = document.createElement('div');
		curTime.style.width = '50px';
		this.curTimeSpan = document.createElement('span');
		this.curTimeSpan.textContent = '00:00';
		curTime.appendChild(this.curTimeSpan);
		this.object.appendChild(curTime);
		this.scrubberTrack = document.createElement('div');
		this.scrubberTrack.className = 'playhead-scrub-track';
		
		this.scrubberHead = document.createElement('div');
		this.scrubberHead.id = 'playhead-scrubber';
		this.scrubberTrack.appendChild(this.scrubberHead);
		this.object.appendChild(this.scrubberTrack);
		
		this.timePerPixel = 0;
		this.maxTime = 0;
		
		this.playbackObject;
		
		this.setTimePerPixel = function(audioObject) {
			//maxTime must be in seconds
			this.playbackObject = audioObject;
			this.maxTime = audioObject.buffer.duration;
			var width = 490; //500 - 10, 5 each side of the tracker head
			this.timePerPixel = this.maxTime/490;
			if (this.maxTime < 60) {
				this.curTimeSpan.textContent = '0.00';
			} else {
				this.curTimeSpan.textContent = '00:00';
			}
		};
		
		this.update = function() {
			// Update the playhead position, startPlay must be called
			if (this.timePerPixel > 0) {
				var time = this.playbackObject.getCurrentPosition();
				if (time > 0) {
					var width = 490;
					var pix = Math.floor(time/this.timePerPixel);
					this.scrubberHead.style.left = pix+'px';
					if (this.maxTime > 60.0) {
						var secs = time%60;
						var mins = Math.floor((time-secs)/60);
						secs = secs.toString();
						secs = secs.substr(0,2);
						mins = mins.toString();
						this.curTimeSpan.textContent = mins+':'+secs;
					} else {
						time = time.toString();
						this.curTimeSpan.textContent = time.substr(0,4);
					}
				} else {
					this.scrubberHead.style.left = '0px';
					if (this.maxTime < 60) {
						this.curTimeSpan.textContent = '0.00';
					} else {
						this.curTimeSpan.textContent = '00:00';
					}
				}
			}
		};
		
		this.interval = undefined;
		
		this.start = function() {
			if (this.playbackObject != undefined && this.interval == undefined) {
				if (this.maxTime < 60) {
					this.interval = setInterval(function(){interfaceContext.playhead.update();},10);
				} else {
					this.interval = setInterval(function(){interfaceContext.playhead.update();},100);
				}
			}
		};
		this.stop = function() {
			clearInterval(this.interval);
			this.interval = undefined;
			if (this.maxTime < 60) {
				this.curTimeSpan.textContent = '0.00';
			} else {
				this.curTimeSpan.textContent = '00:00';
			}
		};
	};
	
	// Global Checkers
	// These functions will help enforce the checkers
	this.checkHiddenAnchor = function()
	{
		var audioHolder = testState.currentStateMap[testState.currentIndex];
		if (audioHolder.anchorId != null)
		{
			var audioObject = audioEngineContext.audioObjects[audioHolder.anchorId];
			if (audioObject.interfaceDOM.getValue() > audioObject.specification.marker && audioObject.interfaceDOM.enforce == true)
			{
				// Anchor is not set below
				console.log('Anchor node not below marker value');
				alert('Please keep listening');
				return false;
			}
		}
		return true;
	};
	
	this.checkHiddenReference = function()
	{
		var audioHolder = testState.currentStateMap[testState.currentIndex];
		if (audioHolder.referenceId != null)
		{
			var audioObject = audioEngineContext.audioObjects[audioHolder.referenceId];
			if (audioObject.interfaceDOM.getValue() < audioObject.specification.marker && audioObject.interfaceDOM.enforce == true)
			{
				// Anchor is not set below
				console.log('Reference node not above marker value');
				alert('Please keep listening');
				return false;
			}
		}
		return true;
	};
}
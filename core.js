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
	
	// Create the popup interface object
	popup = new interfacePopup();
	
	// Create the specification object
	specification = new Specification();
	
	// Create the interface object
	interfaceContext = new Interface(specification);
	// Define window callbacks for interface
	window.onresize = function(event){interfaceContext.resizeWindow(event);};
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
	//var decode = $.parseXML(response);
	//projectXML = $(decode);
	
	var parse = new DOMParser();
	projectXML = parse.parseFromString(response,'text/xml');
	
	// Build the specification
	specification.decode(projectXML);
	
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
	
	// Create the audio engine object
	audioEngineContext = new AudioEngine(specification);
	
	testState.stateMap.push(specification.preTest);
	
	$(specification.audioHolders).each(function(index,elem){
		testState.stateMap.push(elem);
		$(elem.audioElements).each(function(i,audioElem){
			var URL = audioElem.parent.hostURL + audioElem.url;
			var buffer = null;
			for (var i=0; i<audioEngineContext.buffers.length; i++)
			{
				if (URL == audioEngineContext.buffers[i].url)
				{
					buffer = audioEngineContext.buffers[i];
					break;
				}
			}
			if (buffer == null)
			{
				buffer = new audioEngineContext.bufferObj(URL);
				audioEngineContext.buffers.push(buffer);
			}
		});
	});
	
	testState.stateMap.push(specification.postTest);
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
				if (xmlhttp.responseXML == null)
				{
					return createProjectSave(null);
				}
				var response = xmlhttp.responseXML.childNodes[0];
				if (response.getAttribute('state') == "OK")
				{
					var file = response.getElementsByTagName('file')[0];
					console.log('Save OK: Filename '+file.textContent+','+file.getAttribute('bytes')+'B');
					popup.showPopup();
					popup.popupContent.innerHTML = null;
					popup.popupContent.textContent = "Thank you!";
				} else {
					var message = response.getElementsByTagName('message')[0];
					errorSessionDump(message.textContent);
				}
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
	xmlDoc.appendChild(interfaceContext.returnNavigator());
	for (var i=0; i<testState.stateResults.length; i++)
	{
		xmlDoc.appendChild(testState.stateResults[i]);
	}
	
	return xmlDoc;
}

function linearToDecibel(gain)
{
	return 20.0*Math.log10(gain);
}

function decibelToLinear(gain)
{
	return Math.pow(10,gain/20.0);
}

function interfacePopup() {
	// Creates an object to manage the popup
	this.popup = null;
	this.popupContent = null;
	this.popupTitle = null;
	this.popupResponse = null;
	this.buttonProceed = null;
	this.buttonPrevious = null;
	this.popupOptions = null;
	this.currentIndex = null;
	this.responses = null;
	$(window).keypress(function(e){
			if (e.keyCode == 13 && popup.popup.style.visibility == 'visible')
			{
				console.log(e);
				popup.buttonProceed.onclick();
				e.preventDefault();
			}
		});
	
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
		this.popupContent.style.marginTop = '20px';
		this.popupContent.style.marginBottom = '5px';
		this.popup.appendChild(this.popupContent);
		
		var titleHolder = document.createElement('div');
		titleHolder.id = 'popupTitleHolder';
		titleHolder.align = 'center';
		titleHolder.style.width = 'inherit';
		titleHolder.style.minHeight = '25px';
		titleHolder.style.maxHeight = '250px';
		titleHolder.style.overflow = 'auto';
		titleHolder.style.marginBottom = '5px';
		
		this.popupTitle = document.createElement('span');
		this.popupTitle.id = 'popupTitle';
		titleHolder.appendChild(this.popupTitle);
		this.popupContent.appendChild(titleHolder);
		
		this.popupResponse = document.createElement('div');
		this.popupResponse.id = 'popupResponse';
		this.popupResponse.align = 'center';
		this.popupResponse.style.width = 'inherit';
		this.popupResponse.style.minHeight = '50px';
		this.popupResponse.style.maxHeight = '320px';
		this.popupResponse.style.overflow = 'auto';
		this.popupContent.appendChild(this.popupResponse);
		
		this.buttonProceed = document.createElement('button');
		this.buttonProceed.className = 'popupButton';
		this.buttonProceed.position = 'relative';
		this.buttonProceed.style.left = '390px';
		this.buttonProceed.innerHTML = 'Next';
		this.buttonProceed.onclick = function(){popup.proceedClicked();};
		
		this.buttonPrevious = document.createElement('button');
		this.buttonPrevious.className = 'popupButton';
		this.buttonPrevious.position = 'relative';
		this.buttonPrevious.style.left = '10px';
		this.buttonPrevious.innerHTML = 'Back';
		this.buttonPrevious.onclick = function(){popup.previousClick();};
		
		this.popupContent.appendChild(this.buttonPrevious);
		this.popupContent.appendChild(this.buttonProceed);
		
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
		this.buttonPrevious.style.visibility = 'inherit';
	};
	
	this.postNode = function() {
		// This will take the node from the popupOptions and display it
		var node = this.popupOptions[this.currentIndex];
		this.popupResponse.innerHTML = null;
		if (node.type == 'statement') {
			this.popupTitle.textContent = null;
			var statement = document.createElement('span');
			statement.textContent = node.statement;
			this.popupResponse.appendChild(statement);
		} else if (node.type == 'question') {
			this.popupTitle.textContent = node.question;
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
			this.popupResponse.appendChild(textArea);
			textArea.focus();
		} else if (node.type == 'checkbox') {
			this.popupTitle.textContent = node.statement;
			var optHold = this.popupResponse;
			for (var i=0; i<node.options.length; i++) {
				var option = node.options[i];
				var input = document.createElement('input');
				input.id = option.id;
				input.type = 'checkbox';
				var span = document.createElement('span');
				span.textContent = option.text;
				var hold = document.createElement('div');
				hold.setAttribute('name','option');
				hold.style.padding = '4px';
				hold.appendChild(input);
				hold.appendChild(span);
				optHold.appendChild(hold);
			}
		} else if (node.type == 'radio') {
			this.popupTitle.textContent = node.statement;
			var optHold = this.popupResponse;
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
		} else if (node.type == 'number') {
			this.popupTitle.textContent = node.statement;
			var input = document.createElement('input');
			input.type = 'textarea';
			if (node.min != null) {input.min = node.min;}
			if (node.max != null) {input.max = node.max;}
			if (node.step != null) {input.step = node.step;}
			this.popupResponse.appendChild(input);
		}
		var content_height = Number(this.popup.offsetHeight.toFixed());
		content_height -= Number(this.popupContent.offsetHeight.toFixed());
		content_height -=Number(this.buttonProceed.offsetHeight.toFixed());
		content_height = content_height + "px";
		this.buttonProceed.style.top = content_height;
		this.buttonPrevious.style.top = content_height;
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
			this.buttonPrevious.style.visibility = 'visible';
		else
			this.buttonPrevious.style.visibility = 'hidden';
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
			var optHold = this.popupResponse;
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
			var optHold = this.popupResponse;
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
	
	this.resize = function(event)
	{
		// Called on window resize;
		this.popup.style.left = (window.innerWidth/2)-250 + 'px';
		this.popup.style.top = (window.innerHeight/2)-125 + 'px';
		var blank = document.getElementsByClassName('testHalt')[0];
		blank.style.width = window.innerWidth;
		blank.style.height = window.innerHeight;
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
					interfaceContext.newPage(this.currentStateMap);
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
		var metric = document.createElement('metric');
		if (audioEngineContext.metric.enableTestTimer)
		{
			var testTime = document.createElement('metricResult');
			testTime.id = 'testTime';
			testTime.textContent = audioEngineContext.timer.testDuration;
			metric.appendChild(testTime);
		}
		store.appendChild(metric);
		var audioObjects = audioEngineContext.audioObjects;
		for (var i=0; i<audioObjects.length; i++) 
		{
			var audioElement = audioEngineContext.audioObjects[i].exportXMLDOM();
			audioElement.setAttribute('presentedId',i);
			store.appendChild(audioElement);
		}
		$(interfaceContext.commentQuestions).each(function(index,element){
			var node = element.exportXMLDOM();
			store.appendChild(node);
		});
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

function AudioEngine(specification) {
	
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
	this.metric = new sessionMetrics(this,specification);
	
	this.loopPlayback = false;
	
	// Create store for new audioObjects
	this.audioObjects = [];
	
	this.buffers = [];
	this.bufferObj = function(url)
	{
		this.url = url;
		this.buffer = null;
		this.xmlRequest = new XMLHttpRequest();
		this.users = [];
		this.xmlRequest.open('GET',this.url,true);
		this.xmlRequest.responseType = 'arraybuffer';
		
		var bufferObj = this;
		
		// Create callback to decode the data asynchronously
		this.xmlRequest.onloadend = function() {
			audioContext.decodeAudioData(bufferObj.xmlRequest.response, function(decodedData) {
				bufferObj.buffer = decodedData;
				for (var i=0; i<bufferObj.users.length; i++)
				{
					bufferObj.users[i].state = 1;
					if (bufferObj.users[i].interfaceDOM != null)
					{
						bufferObj.users[i].interfaceDOM.enable();
					}
				}
			}, function(){
				// Should only be called if there was an error, but sometimes gets called continuously
				// Check here if the error is genuine
				if (bufferObj.buffer == undefined) {
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
		this.xmlRequest.send();
	};
	
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
						this.audioObjects[id].outputGain.gain.value = this.audioObjects[id].specification.gain;
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

		// Check if audioObject buffer is currently stored by full URL
		var URL = element.parent.hostURL + element.url;
		var buffer = null;
		for (var i=0; i<this.buffers.length; i++)
		{
			if (URL == this.buffers[i].url)
			{
				buffer = this.buffers[i];
				break;
			}
		}
		if (buffer == null)
		{
			console.log("[WARN]: Buffer was not loaded in pre-test! "+URL);
			buffer = new this.bufferObj(URL);
			this.buffers.push(buffer);
		}
		this.audioObjects[audioObjectId].specification = element;
		this.audioObjects[audioObjectId].url = URL;
		this.audioObjects[audioObjectId].buffer = buffer;
		if (buffer.buffer != null)
		{
			this.audioObjects[audioObjectId].state = 1;
		}
		buffer.users.push(this.audioObjects[audioObjectId]);
		return this.audioObjects[audioObjectId];
	};
	
	this.newTestPage = function() {
		this.state = 0;
		this.audioObjectsReady = false;
		this.metric.reset();
		for (var i=0; i < this.buffers.length; i++)
		{
			this.buffers[i].users = [];
		}
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
			lens.push(this.audioObjects[i].buffer.buffer.length);
			if (length < this.audioObjects[i].buffer.buffer.length)
			{
				length = this.audioObjects[i].buffer.buffer.length;
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
			var orig = this.audioObjects[i].buffer.buffer;
			var hold = audioContext.createBuffer(orig.numberOfChannels,length,orig.sampleRate);
			for (var c=0; c<orig.numberOfChannels; c++)
			{
				var inData = hold.getChannelData(c);
				var outData = orig.getChannelData(c);
				for (var n=0; n<orig.length; n++)
				{inData[n] = outData[n];}
			}
			this.audioObjects[i].buffer.buffer = hold;
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
		if (this.bufferNode == undefined && this.buffer.buffer != undefined) {
			this.bufferNode = audioContext.createBufferSource();
			this.bufferNode.owner = this;
			this.bufferNode.connect(this.outputGain);
			this.bufferNode.buffer = this.buffer.buffer;
			this.bufferNode.loop = audioEngineContext.loopPlayback;
			this.bufferNode.onended = function(event) {
				// Safari does not like using 'this' to reference the calling object!
				//event.currentTarget.owner.metric.stopListening(audioEngineContext.timer.getTestTime(),event.currentTarget.owner.getCurrentPosition());
				event.currentTarget.owner.stop();
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
					return (time-this.metric.listenStart)%this.buffer.buffer.duration;
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
	
	this.exportXMLDOM = function() {
		var root = document.createElement('audioElement');
		root.id = this.specification.id;
		root.setAttribute('url',this.specification.url);
		var file = document.createElement('file');
		file.setAttribute('sampleRate',this.buffer.buffer.sampleRate);
		file.setAttribute('channels',this.buffer.buffer.numberOfChannels);
		file.setAttribute('sampleCount',this.buffer.buffer.length);
		file.setAttribute('duration',this.buffer.buffer.duration);
		root.appendChild(file);
		if (this.specification.type != 'outsidereference') {
			var interfaceXML = this.interfaceDOM.exportXMLDOM(this);
			if (interfaceXML.length == undefined) {
				root.appendChild();
			} else {
				for (var i=0; i<interfaceXML.length; i++)
				{
					root.appendChild(interfaceXML[i]);
				}
			}
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

function sessionMetrics(engine,specification)
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
	
	this.enableElementInitialPosition = false;
	this.enableElementListenTracker = false;
	this.enableElementTimer = false;
	this.enableElementTracker = false;
	this.enableFlagListenedTo = false;
	this.enableFlagMoved = false;
	this.enableTestTimer = false;
	// Obtain the metrics enabled
	for (var i=0; i<specification.metrics.length; i++)
	{
		var node = specification.metrics[i];
		switch(node.enabled)
		{
		case 'testTimer':
			this.enableTestTimer = true;
			break;
		case 'elementTimer':
			this.enableElementTimer = true;
			break;
		case 'elementTracker':
			this.enableElementTracker = true;
			break;
		case 'elementListenTracker':
			this.enableElementListenTracker = true;
			break;
		case 'elementInitialPosition':
			this.enableElementInitialPosition = true;
			break;
		case 'elementFlagListenedTo':
			this.enableFlagListenedTo = true;
			break;
		case 'elementFlagMoved':
			this.enableFlagMoved = true;
			break;
		case 'elementFlagComments':
			this.enableFlagComments = true;
			break;
		}
	}
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
	return hold;
	
}

function Specification() {
	// Handles the decoding of the project specification XML into a simple JavaScript Object.
	
	this.interfaceType = null;
	this.commonInterface = new function()
	{
		this.options = [];
		this.optionNode = function(input)
		{
			var name = input.getAttribute('name');
			this.type = name;
			if(this.type == "option")
			{
				this.name = input.id;
			} else if (this.type == "check")
			{
				this.check = input.id;
			}
		};
	};
	
	this.randomiseOrder = function(input)
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
	};
	this.projectReturn = null;
	this.randomiseOrder = null;
	this.collectMetrics = null;
	this.testPages = null;
	this.audioHolders = [];
	this.metrics = [];
	
	this.decode = function(projectXML) {
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
		
		var setupPreTestNode = setupNode.getElementsByTagName('PreTest');
		if (setupPreTestNode.length != 0)
		{
			setupPreTestNode = setupPreTestNode[0];
			this.preTest.construct(setupPreTestNode);
		}
		
		var setupPostTestNode = setupNode.getElementsByTagName('PostTest');
		if (setupPostTestNode.length != 0)
		{
			setupPostTestNode = setupPostTestNode[0];
			this.postTest.construct(setupPostTestNode);
		}
		
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
			var node = new this.audioHolderNode(this);
			node.decode(this,audioHolders[i]);
			this.audioHolders.push(node);
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
	
	this.encode = function()
	{
		var root = document.implementation.createDocument(null,"BrowserEvalProjectDocument");
		// First get all the <setup> tag compiled
		var setupNode = root.createElement("setup");
		setupNode.setAttribute('interface',this.interfaceType);
		setupNode.setAttribute('projectReturn',this.projectReturn);
		setupNode.setAttribute('randomiseOrder',this.randomiseOrder);
		setupNode.setAttribute('collectMetrics',this.collectMetrics);
		setupNode.setAttribute('testPages',this.testPages);
		
		var setupPreTest = root.createElement("PreTest");
		for (var i=0; i<this.preTest.options.length; i++)
		{
			setupPreTest.appendChild(this.preTest.options[i].exportXML(root));
		}
		
		var setupPostTest = root.createElement("PostTest");
		for (var i=0; i<this.postTest.options.length; i++)
		{
			setupPostTest.appendChild(this.postTest.options[i].exportXML(root));
		}
		
		setupNode.appendChild(setupPreTest);
		setupNode.appendChild(setupPostTest);
		
		// <Metric> tag
		var Metric = root.createElement("Metric");
		for (var i=0; i<this.metrics.length; i++)
		{
			var metricEnable = root.createElement("metricEnable");
			metricEnable.textContent = this.metrics[i].enabled;
			Metric.appendChild(metricEnable);
		}
		setupNode.appendChild(Metric);
		
		// <interface> tag
		var CommonInterface = root.createElement("interface");
		for (var i=0; i<this.commonInterface.options.length; i++)
		{
			var CIObj = this.commonInterface.options[i];
			var CINode = root.createElement(CIObj.type);
			if (CIObj.type == "check") {CINode.setAttribute("name",CIObj.check);}
			else {CINode.setAttribute("name",CIObj.name);}
			CommonInterface.appendChild(CINode);
		}
		setupNode.appendChild(CommonInterface);
		
		root.getElementsByTagName("BrowserEvalProjectDocument")[0].appendChild(setupNode);
		// Time for the <audioHolder> tags
		for (var ahIndex = 0; ahIndex < this.audioHolders.length; ahIndex++)
		{
			var node = this.audioHolders[ahIndex].encode(root);
			root.getElementsByTagName("BrowserEvalProjectDocument")[0].appendChild(node);
		}
		return root;
	};
	
	this.prepostNode = function(type) {
		this.type = type;
		this.options = [];
		
		this.OptionNode = function() {
			
			this.childOption = function() {
				this.type = 'option';
				this.id = null;
				this.name = undefined;
				this.text = null;
			};
			
			this.type = undefined;
			this.id = undefined;
			this.mandatory = undefined;
			this.question = undefined;
			this.statement = undefined;
			this.boxsize = undefined;
			this.options = [];
			this.min = undefined;
			this.max = undefined;
			this.step = undefined;
			
			this.decode = function(child)
			{
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
								var node = new this.childOption();
								node.id = element.id;
								node.name = element.getAttribute('name');
								node.text = element.textContent;
								this.options.push(node);
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
			
			this.exportXML = function(root)
			{
				var node = root.createElement(this.type);
				switch(this.type)
				{
				case "statement":
					node.textContent = this.statement;
					break;
				case "question":
					node.id = this.id;
					node.setAttribute("mandatory",this.mandatory);
					node.setAttribute("boxsize",this.boxsize);
					node.textContent = this.question;
					break;
				case "number":
					node.id = this.id;
					node.setAttribute("mandatory",this.mandatory);
					node.setAttribute("min", this.min);
					node.setAttribute("max", this.max);
					node.setAttribute("step", this.step);
					node.textContent = this.statement;
					break;
				case "checkbox":
					node.id = this.id;
					var statement = root.createElement("statement");
					statement.textContent = this.statement;
					node.appendChild(statement);
					for (var i=0; i<this.options.length; i++)
					{
						var option = this.options[i];
						var optionNode = root.createElement("option");
						optionNode.id = option.id;
						optionNode.textContent = option.text;
						node.appendChild(optionNode);
					}
					break;
				case "radio":
					node.id = this.id;
					var statement = root.createElement("statement");
					statement.textContent = this.statement;
					node.appendChild(statement);
					for (var i=0; i<this.options.length; i++)
					{
						var option = this.options[i];
						var optionNode = root.createElement("option");
						optionNode.setAttribute("name",option.name);
						optionNode.textContent = option.text;
						node.appendChild(optionNode);
					}
					break;
				}
				return node;
			};
		};
		this.construct = function(Collection)
		{
			if (Collection.childElementCount != 0) {
				var child = Collection.firstElementChild;
				var node = new this.OptionNode();
				node.decode(child);
				this.options.push(node);
				while (child.nextElementSibling != null) {
					child = child.nextElementSibling;
					node = new this.OptionNode();
					node.decode(child);
					this.options.push(node);
				}
			}
		};
	};
	this.preTest = new this.prepostNode("pretest");
	this.postTest = new this.prepostNode("posttest");
	
	this.metricNode = function(name) {
		this.enabled = name;
	};
	
	this.audioHolderNode = function(parent) {
		this.type = 'audioHolder';
		this.presentedId = undefined;
		this.id = undefined;
		this.hostURL = undefined;
		this.sampleRate = undefined;
		this.randomiseOrder = undefined;
		this.loop = undefined;
		this.elementComments = undefined;
		this.outsideReference = null;
		this.preTest = new parent.prepostNode("pretest");
		this.postTest = new parent.prepostNode("pretest");
		this.interfaces = [];
		this.commentBoxPrefix = "Comment on track";
		this.audioElements = [];
		this.commentQuestions = [];
		
		this.decode = function(parent,xml)
		{
			this.presentedId = parent.audioHolders.length;
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
			
			var setupPreTestNode = xml.getElementsByTagName('PreTest');
			if (setupPreTestNode.length != 0)
			{
				setupPreTestNode = setupPreTestNode[0];
				this.preTest.construct(setupPreTestNode);
			}
			
			var setupPostTestNode = xml.getElementsByTagName('PostTest');
			if (setupPostTestNode.length != 0)
			{
				setupPostTestNode = setupPostTestNode[0];
				this.postTest.construct(setupPostTestNode);
			}
			
			var interfaceDOM = xml.getElementsByTagName('interface');
			for (var i=0; i<interfaceDOM.length; i++) {
				var node = new this.interfaceNode();
				node.decode(interfaceDOM[i]);
				this.interfaces.push(node);
			}
			this.commentBoxPrefix = xml.getElementsByTagName('commentBoxPrefix');
			if (this.commentBoxPrefix.length != 0) {
				this.commentBoxPrefix = this.commentBoxPrefix[0].textContent;
			} else {
				this.commentBoxPrefix = "Comment on track";
			}
			var audioElementsDOM = xml.getElementsByTagName('audioElements');
			for (var i=0; i<audioElementsDOM.length; i++) {
				var node = new this.audioElementNode();
				node.decode(this,audioElementsDOM[i]);
				if (audioElementsDOM[i].getAttribute('type') == 'outsidereference') {
					if (this.outsideReference == null) {
						this.outsideReference = node;
					} else {
						console.log('Error only one audioelement can be of type outsidereference per audioholder');
						this.audioElements.push(node);
						console.log('Element id '+audioElementsDOM[i].id+' made into normal node');
					}
				} else {
					this.audioElements.push(node);
				}
			}
			
			if (this.randomiseOrder == true)
			{
				this.audioElements = randomiseOrder(this.audioElements);
			}
			
			var commentQuestionsDOM = xml.getElementsByTagName('CommentQuestion');
			for (var i=0; i<commentQuestionsDOM.length; i++) {
				var node = new this.commentQuestionNode();
				node.decode(commentQuestionsDOM[i]);
				this.commentQuestions.push(node);
			}
		};
		
		this.encode = function(root)
		{
			var AHNode = root.createElement("audioHolder");
			AHNode.id = this.id;
			AHNode.setAttribute("hostURL",this.hostURL);
			AHNode.setAttribute("sampleRate",this.sampleRate);
			AHNode.setAttribute("randomiseOrder",this.randomiseOrder);
			AHNode.setAttribute("repeatCount",this.repeatCount);
			AHNode.setAttribute("loop",this.loop);
			AHNode.setAttribute("elementComments",this.elementComments);
			
			for (var i=0; i<this.interfaces.length; i++)
			{
				AHNode.appendChild(this.interfaces[i].encode(root));
			}
			
			for (var i=0; i<this.audioElements.length; i++) {
				AHNode.appendChild(this.audioElements[i].encode(root));
			}
			// Create <CommentQuestion>
			for (var i=0; i<this.commentQuestions.length; i++)
			{
				AHNode.appendChild(this.commentQuestions[i].exportXML(root));
			}
			
			// Create <PreTest>
			var AHPreTest = root.createElement("PreTest");
			for (var i=0; i<this.preTest.options.length; i++)
			{
				AHPreTest.appendChild(this.preTest.options[i].exportXML(root));
			}
			
			var AHPostTest = root.createElement("PostTest");
			for (var i=0; i<this.postTest.options.length; i++)
			{
				AHPostTest.appendChild(this.postTest.options[i].exportXML(root));
			}
			AHNode.appendChild(AHPreTest);
			AHNode.appendChild(AHPostTest);
			return AHNode;
		};
		
		this.interfaceNode = function() {
			this.title = undefined;
			this.options = [];
			this.scale = [];
			this.name = undefined;
			this.decode = function(DOM)
			{
				var title = DOM.getElementsByTagName('title');
				if (title.length == 0) {this.title = null;}
				else {this.title = title[0].textContent;}
				var name = DOM.getAttribute("name");
				if (name != undefined) {this.name = name;}
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
			this.encode = function(root)
			{
				var node = root.createElement("interface");
				if (this.title != undefined)
				{
					var title = root.createElement("title");
					title.textContent = this.title;
					node.appendChild(title);
				}
				for (var i=0; i<this.options.length; i++)
				{
					var optionNode = root.createElement(this.options[i].type);
					if (this.options[i].type == "option")
					{
						optionNode.setAttribute("name",this.options[i].name);
					} else if (this.options[i].type == "check") {
						optionNode.setAttribute("check",this.options[i].check);
					} else if (this.options[i].type == "scalerange") {
						optionNode.setAttribute("min",this.options[i].min*100);
						optionNode.setAttribute("max",this.options[i].max*100);
					}
					node.appendChild(optionNode);
				}
				for (var i=0; i<this.scale.length; i++) {
					var scale = root.createElement("scale");
					scale.setAttribute("position",this.scale[i][0]);
					scale.textContent = this.scale[i][1];
					node.appendChild(scale);
				}
				return node;
			};
		};
		
		this.audioElementNode = function() {
			this.url = null;
			this.id = null;
			this.parent = null;
			this.type = "normal";
			this.marker = false;
			this.enforce = false;
			this.gain = 1.0;
			this.decode = function(parent,xml)
			{
				this.url = xml.getAttribute('url');
				this.id = xml.id;
				this.parent = parent;
				this.type = xml.getAttribute('type');
				var gain = xml.getAttribute('gain');
				if (isNaN(gain) == false && gain != null)
				{
					this.gain = decibelToLinear(Number(gain));
				}
				if (this.type == null) {this.type = "normal";}
				if (this.type == 'anchor') {this.anchor = true;}
				else {this.anchor = false;}
				if (this.type == 'reference') {this.reference = true;}
				else {this.reference = false;}
				if (this.anchor == true || this.reference == true)
				{
					this.marker = xml.getAttribute('marker');
					if (this.marker != undefined)
					{
						this.marker = Number(this.marker);
						if (isNaN(this.marker) == false)
						{
							if (this.marker > 1)
							{	this.marker /= 100.0;}
							if (this.marker >= 0 && this.marker <= 1)
							{
								this.enforce = true;
								return;
							} else {
								console.log("ERROR - Marker of audioElement "+this.id+" is not between 0 and 1 (float) or 0 and 100 (integer)!");
								console.log("ERROR - Marker not enforced!");
							}
						} else {
							console.log("ERROR - Marker of audioElement "+this.id+" is not a number!");
							console.log("ERROR - Marker not enforced!");
						}
					}
				}
			};
			this.encode = function(root)
			{
				var AENode = root.createElement("audioElements");
				AENode.id = this.id;
				AENode.setAttribute("url",this.url);
				AENode.setAttribute("type",this.type);
				AENode.setAttribute("gain",linearToDecibel(this.gain));
				if (this.marker != false)
				{
					AENode.setAttribute("marker",this.marker*100);
				}
				return AENode;
			};
		};
		
		this.commentQuestionNode = function(xml) {
			this.id = null;
			this.type = undefined;
			this.question = undefined;
			this.options = [];
			this.statement = undefined;
			
			this.childOption = function() {
				this.type = 'option';
				this.name = null;
				this.text = null;
			};
			this.exportXML = function(root)
			{
				var CQNode = root.createElement("CommentQuestion");
				CQNode.id = this.id;
				CQNode.setAttribute("type",this.type);
				switch(this.type)
				{
				case "text":
					CQNode.textContent = this.question;
					break;
				case "radio":
					var statement = root.createElement("statement");
					statement.textContent = this.statement;
					CQNode.appendChild(statement);
					for (var i=0; i<this.options.length; i++)
					{
						var optionNode = root.createElement("option");
						optionNode.setAttribute("name",this.options[i].name);
						optionNode.textContent = this.options[i].text;
						CQNode.appendChild(optionNode);
					}
					break;
				case "checkbox":
					var statement = root.createElement("statement");
					statement.textContent = this.statement;
					CQNode.appendChild(statement);
					for (var i=0; i<this.options.length; i++)
					{
						var optionNode = root.createElement("option");
						optionNode.setAttribute("name",this.options[i].name);
						optionNode.textContent = this.options[i].text;
						CQNode.appendChild(optionNode);
					}
					break;
				}
				return CQNode;
			};
			this.decode = function(xml) {
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
							var node = new this.childOption();
							node.name = child.getAttribute('name');
							node.text = child.textContent;
							this.options.push(node);
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
							var node = new this.childOption();
							node.name = child.getAttribute('name');
							node.text = child.textContent;
							this.options.push(node);
						}
						child = child.nextElementSibling;
					}
					break;
				}
			};
		};
	};
}
			
function Interface(specificationObject) {
	// This handles the bindings between the interface and the audioEngineContext;
	this.specification = specificationObject;
	this.insertPoint = document.getElementById("topLevelBody");
	
	this.newPage = function(audioHolderObject)
	{
		audioEngineContext.newTestPage();
		/// CHECK FOR SAMPLE RATE COMPATIBILITY
		if (audioHolderObject.sampleRate != undefined) {
			if (Number(audioHolderObject.sampleRate) != audioContext.sampleRate) {
				var errStr = 'Sample rates do not match! Requested '+Number(audioHolderObject.sampleRate)+', got '+audioContext.sampleRate+'. Please set the sample rate to match before completing this test.';
				alert(errStr);
				return;
			}
		}
		
		audioEngineContext.loopPlayback = audioHolderObject.loop;
		// Delete any previous audioObjects associated with the audioEngine
		audioEngineContext.audioObjects = [];
		interfaceContext.deleteCommentBoxes();
		interfaceContext.deleteCommentQuestions();
		loadTest(audioHolderObject);
	};
	
	// Bounded by interface!!
	// Interface object MUST have an exportXMLDOM method which returns the various DOM levels
	// For example, APE returns  the slider position normalised in a <value> tag.
	this.interfaceObjects = [];
	this.interfaceObject = function(){};
	
	this.resizeWindow = function(event)
	{
		popup.resize(event);
		for(var i=0; i<this.commentBoxes.length; i++)
		{this.commentBoxes[i].resize();}
		for(var i=0; i<this.commentQuestions.length; i++)
		{this.commentQuestions[i].resize();}
		try
		{
			resizeWindow(event);
		}
		catch(err)
		{
			console.log("Warning - Interface does not have Resize option");
			console.log(err);
		}
	};
	
	this.returnNavigator = function()
	{
		var node = document.createElement("navigator");
		var platform = document.createElement("platform");
		platform.textContent = navigator.platform;
		var vendor = document.createElement("vendor");
		vendor.textContent = navigator.vendor;
		var userAgent = document.createElement("uagent");
		userAgent.textContent = navigator.userAgent;
		node.appendChild(platform);
		node.appendChild(vendor);
		node.appendChild(userAgent);
		return node;
	};
	
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
				console.log("Comment frag-"+this.id+": "+response.textContent);
				root.appendChild(question);
				root.appendChild(response);
			}
			return root;
		};
		this.resize = function()
		{
			var boxwidth = (window.innerWidth-100)/2;
			if (boxwidth >= 600)
			{
				boxwidth = 600;
			}
			else if (boxwidth < 400)
			{
				boxwidth = 400;
			}
			this.trackComment.style.width = boxwidth+"px";
			this.trackCommentBox.style.width = boxwidth-6+"px";
		};
		this.resize();
	};
	
	this.commentQuestions = [];
	
	this.commentBox = function(commentQuestion) {
		this.specification = commentQuestion;
		// Create document objects to hold the comment boxes
		this.holder = document.createElement('div');
		this.holder.className = 'comment-div';
		// Create a string next to each comment asking for a comment
		this.string = document.createElement('span');
		this.string.innerHTML = commentQuestion.question;
		// Create the HTML5 comment box 'textarea'
		this.textArea = document.createElement('textarea');
		this.textArea.rows = '4';
		this.textArea.cols = '100';
		this.textArea.className = 'trackComment';
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
		this.resize = function()
		{
			var boxwidth = (window.innerWidth-100)/2;
			if (boxwidth >= 600)
			{
				boxwidth = 600;
			}
			else if (boxwidth < 400)
			{
				boxwidth = 400;
			}
			this.holder.style.width = boxwidth+"px";
			this.textArea.style.width = boxwidth-6+"px";
		};
		this.resize();
	};
	
	this.radioBox = function(commentQuestion) {
		this.specification = commentQuestion;
		// Create document objects to hold the comment boxes
		this.holder = document.createElement('div');
		this.holder.className = 'comment-div';
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
		for (var i=0; i<optCount; i++)
		{
			var div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
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
		this.resize = function()
		{
			var boxwidth = (window.innerWidth-100)/2;
			if (boxwidth >= 600)
			{
				boxwidth = 600;
			}
			else if (boxwidth < 400)
			{
				boxwidth = 400;
			}
			this.holder.style.width = boxwidth+"px";
			var text = this.holder.children[2];
			var options = this.holder.children[3];
			var optCount = options.children.length;
			var spanMargin = Math.floor(((boxwidth-20-(optCount*80))/(optCount))/2)+'px';
			var options = options.firstChild;
			var text = text.firstChild;
			options.style.marginRight = spanMargin;
			options.style.marginLeft = spanMargin;
			text.style.marginRight = spanMargin;
			text.style.marginLeft = spanMargin;
			while(options.nextSibling != undefined)
			{
				options = options.nextSibling;
				text = text.nextSibling;
				options.style.marginRight = spanMargin;
				options.style.marginLeft = spanMargin;
				text.style.marginRight = spanMargin;
				text.style.marginLeft = spanMargin;
			}
		};
		this.resize();
	};
	
	this.checkboxBox = function(commentQuestion) {
		this.specification = commentQuestion;
		// Create document objects to hold the comment boxes
		this.holder = document.createElement('div');
		this.holder.className = 'comment-div';
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
		for (var i=0; i<optCount; i++)
		{
			var div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
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
		this.resize = function()
		{
			var boxwidth = (window.innerWidth-100)/2;
			if (boxwidth >= 600)
			{
				boxwidth = 600;
			}
			else if (boxwidth < 400)
			{
				boxwidth = 400;
			}
			this.holder.style.width = boxwidth+"px";
			var text = this.holder.children[2];
			var options = this.holder.children[3];
			var optCount = options.children.length;
			var spanMargin = Math.floor(((boxwidth-20-(optCount*80))/(optCount))/2)+'px';
			var options = options.firstChild;
			var text = text.firstChild;
			options.style.marginRight = spanMargin;
			options.style.marginLeft = spanMargin;
			text.style.marginRight = spanMargin;
			text.style.marginLeft = spanMargin;
			while(options.nextSibling != undefined)
			{
				options = options.nextSibling;
				text = text.nextSibling;
				options.style.marginRight = spanMargin;
				options.style.marginLeft = spanMargin;
				text.style.marginRight = spanMargin;
				text.style.marginLeft = spanMargin;
			}
		};
		this.resize();
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
			this.maxTime = audioObject.buffer.buffer.duration;
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
	
	this.checkFragmentsFullyPlayed = function ()
	{
		// Checks the entire file has been played back
		// NOTE ! This will return true IF playback is Looped!!!
		if (audioEngineContext.loopPlayback)
		{
			console.log("WARNING - Looped source: Cannot check fragments are fully played");
			return true;
		}
		var check_pass = true;
		var error_obj = [];
		for (var i = 0; i<audioEngineContext.audioObjects.length; i++)
		{
			var object = audioEngineContext.audioObjects[i];
			var time = object.buffer.duration;
			var metric = object.metric;
			var passed = false;
			for (var j=0; j<metric.listenTracker.length; j++)
			{
				var bt = metric.listenTracker[j].getElementsByTagName('buffertime');
				var start_time = Number(bt[0].getAttribute('start'));
				var stop_time = Number(bt[0].getAttribute('stop'));
				var delta = stop_time - start_time;
				if (delta >= time)
				{
					passed = true;
					break;
				}
			}
			if (passed == false)
			{
				check_pass = false;
				console.log("Continue listening to track-"+i);
				error_obj.push(i);
			}
		}
		if (check_pass == false)
		{
			var str_start = "You have not listened to fragments ";
			for (var i=0; i<error_obj.length; i++)
			{
				str_start += error_obj[i];
				if (i != error_obj.length-1)
				{
					str_start += ', ';
				}
			}
			str_start += ". Please keep listening";
			console.log("[ALERT]: "+str_start);
			alert(str_start);
		}
	};
}
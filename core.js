/**
 * core.js
 * 
 * Main script to run, calls all other core functions and manages loading/store to backend.
 * Also contains all global variables.
 */

/* create the web audio API context and store in audioContext*/
var audioContext; // Hold the browser web audio API
var projectXML; // Hold the parsed setup XML
var schemaXSD; // Hold the parsed schema XSD
var specification;
var interfaceContext;
var storage;
var popup; // Hold the interfacePopup object
var testState;
var currentTrackOrder = []; // Hold the current XML tracks in their (randomised) order
var audioEngineContext; // The custome AudioEngine object
var projectReturn; // Hold the URL for the return


// Add a prototype to the bufferSourceNode to reference to the audioObject holding it
AudioBufferSourceNode.prototype.owner = undefined;
// Add a prototype to the bufferNode to hold the desired LINEAR gain
AudioBuffer.prototype.playbackGain = undefined;
// Add a prototype to the bufferNode to hold the computed LUFS loudness
AudioBuffer.prototype.lufs = undefined;

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
	
	// Create the storage object
	storage = new Storage();
	// Define window callbacks for interface
	window.onresize = function(event){interfaceContext.resizeWindow(event);};
};

function loadProjectSpec(url) {
	// Load the project document from the given URL, decode the XML and instruct audioEngine to get audio data
	// If url is null, request client to upload project XML document
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("GET",'test-schema.xsd',true);
	xmlhttp.onload = function()
	{
		schemaXSD = xmlhttp.response;
		var parse = new DOMParser();
		specification.schema = parse.parseFromString(xmlhttp.response,'text/xml');
		var r = new XMLHttpRequest();
		r.open('GET',url,true);
		r.onload = function() {
			loadProjectSpecCallback(r.response);
		};
		r.send();
	};
	xmlhttp.send();
};

function loadProjectSpecCallback(response) {
	// Function called after asynchronous download of XML project specification
	//var decode = $.parseXML(response);
	//projectXML = $(decode);
	
	// First perform XML schema validation
	var Module = {
		xml: response,
		schema: schemaXSD,
		arguments:["--noout", "--schema", 'test-schema.xsd','document.xml']
	};
	
	var xmllint = validateXML(Module);
	console.log(xmllint);
	if(xmllint != 'document.xml validates\n')
	{
		document.getElementsByTagName('body')[0].innerHTML = null;
		var msg = document.createElement("h3");
		msg.textContent = "FATAL ERROR";
		var span = document.createElement("h4");
		span.textContent = "The XML validator returned the following errors when decoding your XML file";
		document.getElementsByTagName('body')[0].appendChild(msg);
		document.getElementsByTagName('body')[0].appendChild(span);
		xmllint = xmllint.split('\n');
		for (var i in xmllint)
		{
			document.getElementsByTagName('body')[0].appendChild(document.createElement('br'));
			var span = document.createElement("span");
			span.textContent = xmllint[i];
			document.getElementsByTagName('body')[0].appendChild(span);
		}
		return;
	}
	
	var parse = new DOMParser();
	projectXML = parse.parseFromString(response,'text/xml');
	var errorNode = projectXML.getElementsByTagName('parsererror');
	if (errorNode.length >= 1)
	{
		var msg = document.createElement("h3");
		msg.textContent = "FATAL ERROR";
		var span = document.createElement("span");
		span.textContent = "The XML parser returned the following errors when decoding your XML file";
		document.getElementsByTagName('body')[0].innerHTML = null;
		document.getElementsByTagName('body')[0].appendChild(msg);
		document.getElementsByTagName('body')[0].appendChild(span);
		document.getElementsByTagName('body')[0].appendChild(errorNode[0]);
		return;
	}
	
	// Build the specification
	specification.decode(projectXML);
	storage.initialise();
	
	// Detect the interface to use and load the relevant javascripts.
	var interfaceJS = document.createElement('script');
	interfaceJS.setAttribute("type","text/javascript");
	switch(specification.interface)
	{
		case "APE":
		interfaceJS.setAttribute("src","ape.js");
		
		// APE comes with a css file
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.href = 'ape.css';
		
		document.getElementsByTagName("head")[0].appendChild(css);
		break;
		
		case "MUSHRA":
		interfaceJS.setAttribute("src","mushra.js");
		
		// MUSHRA comes with a css file
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.href = 'mushra.css';
		
		document.getElementsByTagName("head")[0].appendChild(css);
		break;
		
		case "AB":
		interfaceJS.setAttribute("src","AB.js");
		
		// AB comes with a css file
		var css = document.createElement('link');
		css.rel = 'stylesheet';
		css.type = 'text/css';
		css.href = 'AB.css';
		
		document.getElementsByTagName("head")[0].appendChild(css);
	}
	document.getElementsByTagName("head")[0].appendChild(interfaceJS);
	
	// Create the audio engine object
	audioEngineContext = new AudioEngine(specification);
	
	$(specification.pages).each(function(index,elem){
		$(elem.audioElements).each(function(i,audioElem){
			var URL = elem.hostURL + audioElem.url;
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
				buffer = new audioEngineContext.bufferObj();
				buffer.getMedia(URL);
				audioEngineContext.buffers.push(buffer);
			}
		});
	});
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
		popup.popupContent.innerHTML = "</span>Please save the file below to give to your test supervisor</span><br>";
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
					createProjectSave('null');
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
		popup.showPopup();
		popup.popupContent.innerHTML = null;
		popup.popupContent.textContent = "Submitting. Please Wait";
	}
}

function errorSessionDump(msg){
	// Create the partial interface XML save
	// Include error node with message on why the dump occured
	popup.showPopup();
	popup.popupContent.innerHTML = null;
	var err = document.createElement('error');
	var parent = document.createElement("div");
	if (typeof msg === "object")
	{
		err.appendChild(msg);
		popup.popupContent.appendChild(msg);
		
	} else {
		err.textContent = msg;
		popup.popupContent.innerHTML = "ERROR : "+msg;
	}
	var xmlDoc = interfaceXMLSave();
	xmlDoc.appendChild(err);
	parent.appendChild(xmlDoc);
	var file = [parent.innerHTML];
	var bb = new Blob(file,{type : 'application/xml'});
	var dnlk = window.URL.createObjectURL(bb);
	var a = document.createElement("a");
	a.hidden = '';
	a.href = dnlk;
	a.download = "save.xml";
	a.textContent = "Save File";
	
	
	
	popup.popupContent.appendChild(a);
}

// Only other global function which must be defined in the interface class. Determines how to create the XML document.
function interfaceXMLSave(){
	// Create the XML string to be exported with results
	return storage.finish();
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
	this.node = null;
	this.store = null;
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
		this.popupTitle.textContent = node.specification.statement;
		if (node.specification.type == 'question') {
			var textArea = document.createElement('textarea');
			switch (node.specification.boxsize) {
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
		} else if (node.specification.type == 'checkbox') {
			for (var option of node.specification.options) {
				var input = document.createElement('input');
				input.id = option.name;
				input.type = 'checkbox';
				var span = document.createElement('span');
				span.textContent = option.text;
				var hold = document.createElement('div');
				hold.setAttribute('name','option');
				hold.style.padding = '4px';
				hold.appendChild(input);
				hold.appendChild(span);
				this.popupResponse.appendChild(hold);
			}
		} else if (node.specification.type == 'radio') {
			for (var option of node.specification.options) {
				var input = document.createElement('input');
				input.id = option.name;
				input.type = 'radio';
				input.name = node.specification.id;
				var span = document.createElement('span');
				span.textContent = option.text;
				var hold = document.createElement('div');
				hold.setAttribute('name','option');
				hold.style.padding = '4px';
				hold.appendChild(input);
				hold.appendChild(span);
				this.popupResponse.appendChild(hold);
			}
		} else if (node.specification.type == 'number') {
			var input = document.createElement('input');
			input.type = 'textarea';
			if (node.min != null) {input.min = node.specification.min;}
			if (node.max != null) {input.max = node.specification.max;}
			if (node.step != null) {input.step = node.specification.step;}
			this.popupResponse.appendChild(input);
		}
		var content_height = Number(this.popup.offsetHeight.toFixed());
		content_height -= Number(this.popupContent.offsetHeight.toFixed());
		content_height -=Number(this.buttonProceed.offsetHeight.toFixed());
		content_height = content_height + "px";
		this.buttonProceed.style.top = content_height;
		this.buttonPrevious.style.top = content_height;
		if(this.currentIndex+1 == this.popupOptions.length) {
			if (this.node.location == "pre") {
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
	
	this.initState = function(node,store) {
		//Call this with your preTest and postTest nodes when needed to
		// initialise the popup procedure.
		if (node.options.length > 0) {
			this.popupOptions = [];
			this.node = node;
			this.store = store;
			for (var opt of node.options)
			{
				this.popupOptions.push({
					specification: opt,
					response: null
				});
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
		if (node.specification.type == 'question') {
			// Must extract the question data
			var textArea = $(popup.popupContent).find('textarea')[0];
			if (node.specification.mandatory == true && textArea.value.length == 0) {
				alert('This question is mandatory');
				return;
			} else {
				// Save the text content
				console.log("Question: "+ node.specification.statement);
				console.log("Question Response: "+ textArea.value);
				node.response = textArea.value;
			}
		} else if (node.specification.type == 'checkbox') {
			// Must extract checkbox data
			console.log("Checkbox: "+ node.specification.statement);
			var inputs = this.popupResponse.getElementsByTagName('input');
			node.response = [];
			for (var i=0; i<node.specification.options.length; i++) {
				node.response.push({
					name: node.specification.options[i].name,
					text: node.specification.options[i].text,
					checked: inputs[i].checked
				});
				console.log(node.specification.options[i].name+": "+ inputs[i].checked);
			}
		} else if (node.specification.type == "radio") {
			var optHold = this.popupResponse;
			console.log("Radio: "+ node.specification.statement);
			node.response = null;
			var i=0;
			var inputs = optHold.getElementsByTagName('input');
			while(node.response == null) {
				if (i == inputs.length)
				{
					if (node.specification.mandatory == true)
					{
						alert("This radio is mandatory");
					} else {
						node.response = -1;
					}
					return;
				}
				if (inputs[i].checked == true) {
					node.response = node.specification.options[i];
					console.log("Selected: "+ node.specification.options[i].name);
				}
				i++;
			}
		} else if (node.specification.type == "number") {
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
			node.response = input.value;
		}
		this.currentIndex++;
		if (this.currentIndex < this.popupOptions.length) {
			this.postNode();
		} else {
			// Reached the end of the popupOptions
			this.hidePopup();
			for (var node of this.popupOptions)
			{
				this.store.postResult(node);
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
	this.preTestSurvey = null;
	this.postTestSurvey = null;
	this.stateIndex = null;
	this.currentStateMap = null;
	this.currentStatePosition = null;
	this.currentTestId = 0;
	this.stateResults = [];
	this.timerCallBackHolders = null;
	this.initialise = function(){
		
		// Get the data from Specification
		var pageHolder = [];
		for (var page of specification.pages)
		{
			pageHolder.push(page);
		}
		if (specification.randomiseOrder)
		{
			pageHolder = randomiseOrder(pageHolder);
		}
		for (var i=0; i<pageHolder.length; i++)
		{
			pageHolder[i].presentedId = i;
		}
		for (var i=0; i<specification.pages.length; i++)
		{
			if (specification.testPages < i && specification.testPages != 0) {break;}
			this.stateMap.push(pageHolder[i]);
			
		}
		if (specification.preTest != null) {this.preTestSurvey = specification.preTest;}
		if (specification.postTest != null) {this.postTestSurvey = specification.postTest;}
		
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
			if (this.preTestSurvey != null)
			{
				popup.initState(this.preTestSurvey,storage.globalPreTest);
			}
			this.stateIndex++;
		} else if (this.stateIndex == this.stateMap.length)
		{
			// All test pages complete, post test
			console.log('Ending test ...');
			this.stateIndex++;
			if (this.postTestSurvey == null) {
				this.advanceState();
			} else {
				popup.initState(this.postTestSurvey,storage.globalPostTest);
			}
		} else if (this.stateIndex > this.stateMap.length)
		{
			createProjectSave(specification.projectReturn);
		}
		else
		{
			if (this.currentStateMap == null)
			{
				this.currentStateMap = this.stateMap[this.stateIndex];
				if (this.currentStateMap.randomiseOrder)
				{
					this.currentStateMap.audioElements = randomiseOrder(this.currentStateMap.audioElements);
				}
				storage.createTestPageStore(this.currentStateMap);
				if (this.currentStateMap.preTest != null)
				{
					this.currentStatePosition = 'pre';
					popup.initState(this.currentStateMap.preTest,storage.testPages[this.stateIndex].preTest);
				} else {
					this.currentStatePosition = 'test';
				}
				interfaceContext.newPage(this.currentStateMap,storage.testPages[this.stateIndex]);
				return;
			}
			switch(this.currentStatePosition)
			{
			case 'pre':
				this.currentStatePosition = 'test';
				break;
			case 'test':
				this.currentStatePosition = 'post';
				// Save the data
				this.testPageCompleted();
				if (this.currentStateMap.postTest == null)
				{
					this.advanceState();
					return;
				} else {
					popup.initState(this.currentStateMap.postTest,storage.testPages[this.stateIndex].postTest);
				}
				break;
			case 'post':
				this.stateIndex++;
				this.currentStateMap = null;
				this.advanceState();
				break;
			};
		}
	};
	
	this.testPageCompleted = function() {
		// Function called each time a test page has been completed
		var storePoint = storage.testPages[this.stateIndex];
		// First get the test metric
		
		var metric = storePoint.XMLDOM.getElementsByTagName('metric')[0];
		if (audioEngineContext.metric.enableTestTimer)
		{
			var testTime = storePoint.parent.document.createElement('metricresult');
			testTime.id = 'testTime';
			testTime.textContent = audioEngineContext.timer.testDuration;
			metric.appendChild(testTime);
		}
		
		var audioObjects = audioEngineContext.audioObjects;
		for (var ao of audioEngineContext.audioObjects) 
		{
			ao.exportXMLDOM();
		}
		for (var element of interfaceContext.commentQuestions)
		{
			element.exportXMLDOM(storePoint);
		}
		pageXMLSave(storePoint.XMLDOM, this.currentStateMap);
	};
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
	
	this.pageStore = null;
	
	// Create store for new audioObjects
	this.audioObjects = [];
	
	this.buffers = [];
	this.bufferObj = function()
	{
		this.url = null;
		this.buffer = null;
		this.xmlRequest = new XMLHttpRequest();
		this.xmlRequest.parent = this;
		this.users = [];
		this.getMedia = function(url) {
			this.url = url;
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
							bufferObj.users[i].bufferLoaded(bufferObj);
						}
					}
					calculateLoudness(bufferObj.buffer,"I");
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
			this.progress = 0;
			this.progressCallback = function(event){
				if (event.lengthComputable)
				{
					this.parent.progress = event.loaded / event.total;
					for (var i=0; i<this.parent.users.length; i++)
					{
						if(this.parent.users[i].interfaceDOM != null)
						{
							if (typeof this.parent.users[i].interfaceDOM.updateLoading === "function")
							{
								this.parent.users[i].interfaceDOM.updateLoading(this.parent.progress*100);
							}
						}
					}
				}
			};
			this.xmlRequest.addEventListener("progress", this.progressCallback);
			this.xmlRequest.send();
		};
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
						this.audioObjects[id].outputGain.gain.value = this.audioObjects[id].onplayGain;
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
		var URL = testState.currentStateMap.hostURL + element.url;
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
			buffer = new this.bufferObj();
			buffer.getMedia(URL);
			this.buffers.push(buffer);
		}
		this.audioObjects[audioObjectId].specification = element;
		this.audioObjects[audioObjectId].url = URL;
		buffer.users.push(this.audioObjects[audioObjectId]);
		// Obtain store node
		var aeNodes = this.pageStore.XMLDOM.getElementsByTagName('audioelement');
		for (var i=0; i<aeNodes.length; i++)
		{
			if(aeNodes[i].id == element.id)
			{
				this.audioObjects[audioObjectId].storeDOM = aeNodes[i];
				break;
			}
		}
		if (buffer.buffer != null)
		{
			this.audioObjects[audioObjectId].bufferLoaded(buffer);
		}
		return this.audioObjects[audioObjectId];
	};
	
	this.newTestPage = function(store) {
		this.pageStore = store;
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
		var maxId;
		for (var i=0; i<this.audioObjects.length; i++)
		{
			if (length < this.audioObjects[i].buffer.buffer.length)
			{
				length = this.audioObjects[i].buffer.buffer.length;
				maxId = i;
			}
		}
		// Extract the audio and zero-pad
		for (var i=0; i<this.audioObjects.length; i++)
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
			hold.playbackGain = orig.playbackGain;
			hold.lufs = orig.lufs;
			this.audioObjects[i].buffer.buffer = hold;
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
	this.storeDOM = null;
	
	// Bindings for GUI
	this.interfaceDOM = null;
	this.commentDOM = null;
	
	// Create a buffer and external gain control to allow internal patching of effects and volume leveling.
	this.bufferNode = undefined;
	this.outputGain = audioContext.createGain();
	
	// Default output gain to be zero
	this.outputGain.gain.value = 0.0;
	this.onplayGain = 1.0;
	
	// Connect buffer to the audio graph
	this.outputGain.connect(audioEngineContext.outputGain);
	
	// the audiobuffer is not designed for multi-start playback
	// When stopeed, the buffer node is deleted and recreated with the stored buffer.
	this.buffer;
	
	this.bufferLoaded = function(callee)
	{
		// Called by the associated buffer when it has finished loading, will then 'bind' the buffer to the
		// audioObject and trigger the interfaceDOM.enable() function for user feedback
		if (audioEngineContext.loopPlayback){
			// First copy the buffer into this.buffer
			this.buffer = new audioEngineContext.bufferObj();
			this.buffer.url = callee.url;
			this.buffer.buffer = audioContext.createBuffer(callee.buffer.numberOfChannels, callee.buffer.length, callee.buffer.sampleRate);
			for (var c=0; c<callee.buffer.numberOfChannels; c++)
			{
				var src = callee.buffer.getChannelData(c);
				var dst = this.buffer.buffer.getChannelData(c);
				for (var n=0; n<src.length; n++)
				{
					dst[n] = src[n];
				}
			}
		} else {
			this.buffer = callee;
		}
		this.state = 1;
		this.buffer.buffer.playbackGain = callee.buffer.playbackGain;
		this.buffer.buffer.lufs = callee.buffer.lufs;
		var targetLUFS = this.specification.parent.loudness;
		if (typeof targetLUFS === "number")
		{
			this.buffer.buffer.playbackGain = decibelToLinear(targetLUFS - this.buffer.buffer.lufs);
		} else {
			this.buffer.buffer.playbackGain = 1.0;
		}
		if (this.interfaceDOM != null) {
			this.interfaceDOM.enable();
		}
		this.onplayGain = decibelToLinear(this.specification.gain)*this.buffer.buffer.playbackGain;
		
		this.storeDOM.setAttribute('presentedId',this.id);
		this.storeDOM.setAttribute('playGain',linearToDecibel(this.onplayGain));
	};
	
	this.bindInterface = function(interfaceObject)
	{
		this.interfaceDOM = interfaceObject;
		this.metric.initialise(interfaceObject.getValue());
		if (this.state == 1)
		{
			this.interfaceDOM.enable();
		}
	};
    
	this.loopStart = function() {
		this.outputGain.gain.value = this.onplayGain;
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
		var file = storage.document.createElement('file');
		file.setAttribute('sampleRate',this.buffer.buffer.sampleRate);
		file.setAttribute('channels',this.buffer.buffer.numberOfChannels);
		file.setAttribute('sampleCount',this.buffer.buffer.length);
		file.setAttribute('duration',this.buffer.buffer.duration);
		this.storeDOM.appendChild(file);
		if (this.specification.type != 'outside-reference') {
			var interfaceXML = this.interfaceDOM.exportXMLDOM(this);
			if (interfaceXML.length == undefined) {
				this.storeDOM.appendChild(interfaceXML);
			} else {
				for (var i=0; i<interfaceXML.length; i++)
				{
					this.storeDOM.appendChild(interfaceXML[i]);
				}
			}
			if (this.commentDOM != null) {
				this.storeDOM.appendChild(this.commentDOM.exportXMLDOM(this));
			}
		}
		var nodes = this.metric.exportXMLDOM();
		var mroot = this.storeDOM.getElementsByTagName('metric')[0];
		for (var i=0; i<nodes.length; i++)
		{
			mroot.appendChild(nodes[i]);
		}
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
	for (var i=0; i<specification.metrics.enabled.length; i++)
	{
		var node = specification.metrics.enabled[i];
		switch(node)
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
	
	this.initialise = function(position)
	{
		if (this.initialPosition == -1) {
			this.initialPosition = position;
			this.moved(0,position);
		}
	};
	
	this.moved = function(time,position)
	{
		if (time > 0) {this.wasMoved = true;}
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
		var storeDOM = [];
		if (audioEngineContext.metric.enableElementTimer) {
			var mElementTimer = storage.document.createElement('metricresult');
			mElementTimer.setAttribute('name','enableElementTimer');
			mElementTimer.textContent = this.listenedTimer;
			storeDOM.push(mElementTimer);
		}
		if (audioEngineContext.metric.enableElementTracker) {
			var elementTrackerFull = storage.document.createElement('metricResult');
			elementTrackerFull.setAttribute('name','elementTrackerFull');
			for (var k=0; k<this.movementTracker.length; k++)
			{
				var timePos = storage.document.createElement('timePos');
				timePos.id = k;
				var time = storage.document.createElement('time');
				time.textContent = this.movementTracker[k][0];
				var position = document.createElement('position');
				position.textContent = this.movementTracker[k][1];
				timePos.appendChild(time);
				timePos.appendChild(position);
				elementTrackerFull.appendChild(timePos);
			}
			storeDOM.push(elementTrackerFull);
		}
		if (audioEngineContext.metric.enableElementListenTracker) {
			var elementListenTracker = storage.document.createElement('metricResult');
			elementListenTracker.setAttribute('name','elementListenTracker');
			for (var k=0; k<this.listenTracker.length; k++) {
				elementListenTracker.appendChild(this.listenTracker[k]);
			}
			storeDOM.push(elementListenTracker);
		}
		if (audioEngineContext.metric.enableElementInitialPosition) {
			var elementInitial = storage.document.createElement('metricResult');
			elementInitial.setAttribute('name','elementInitialPosition');
			elementInitial.textContent = this.initialPosition;
			storeDOM.push(elementInitial);
		}
		if (audioEngineContext.metric.enableFlagListenedTo) {
			var flagListenedTo = storage.document.createElement('metricResult');
			flagListenedTo.setAttribute('name','elementFlagListenedTo');
			flagListenedTo.textContent = this.wasListenedTo;
			storeDOM.push(flagListenedTo);
		}
		if (audioEngineContext.metric.enableFlagMoved) {
			var flagMoved = storage.document.createElement('metricResult');
			flagMoved.setAttribute('name','elementFlagMoved');
			flagMoved.textContent = this.wasMoved;
			storeDOM.push(flagMoved);
		}
		if (audioEngineContext.metric.enableFlagComments) {
			var flagComments = storage.document.createElement('metricResult');
			flagComments.setAttribute('name','elementFlagComments');
			if (this.parent.commentDOM == null)
				{flag.textContent = 'false';}
			else if (this.parent.commentDOM.textContent.length == 0) 
				{flag.textContent = 'false';}
			else 
				{flag.textContet = 'true';}
			storeDOM.push(flagComments);
		}
		return storeDOM;
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
	
	this.interface = null;
	this.projectReturn = null;
	this.randomiseOrder = null;
	this.testPages = null;
	this.pages = [];
	this.metrics = null;
	this.interfaces = null;
	this.loudness = null;
	this.errors = [];
	this.schema = null;
	
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
	
	this.processAttribute = function(attribute,schema)
	{
		// attribute is the string returned from getAttribute on the XML
		// schema is the <xs:attribute> node
		if (schema.getAttribute('name') == undefined && schema.getAttribute('ref') != undefined)
		{
			schema = this.schema.getElementsByName(schema.getAttribute('ref'))[0];
		}
		var defaultOpt = schema.getAttribute('default');
		if (attribute == null) {
			attribute = defaultOpt;
		}
		var dataType = schema.getAttribute('type');
		if (typeof dataType == "string") { dataType = dataType.substr(3);}
		else {dataType = "string";}
		if (attribute == null)
		{
			return attribute;
		}
		switch(dataType)
		{
		case "boolean":
			if (attribute == 'true'){attribute = true;}else{attribute=false;}
			break;
		case "negativeInteger":
		case "positiveInteger":
		case "nonNegativeInteger":
		case "nonPositiveInteger":
		case "integer":
		case "decimal":
		case "short":
			attribute = Number(attribute);
			break;
		case "string":
		default:
			attribute = String(attribute);
			break;
		}
		return attribute;
	};
	
	this.decode = function(projectXML) {
		this.errors = [];
		// projectXML - DOM Parsed document
		this.projectXML = projectXML.childNodes[0];
		var setupNode = projectXML.getElementsByTagName('setup')[0];
		var schemaSetup = this.schema.getElementsByName('setup')[0];
		// First decode the attributes
		var attributes = schemaSetup.getElementsByTagName('attribute');
		for (var i in attributes)
		{
			if (isNaN(Number(i)) == true){break;}
			var attributeName = attributes[i].getAttribute('name');
			var projectAttr = setupNode.getAttribute(attributeName);
			projectAttr = this.processAttribute(projectAttr,attributes[i]);
			switch(typeof projectAttr)
			{
			case "number":
			case "boolean":
				eval('this.'+attributeName+' = '+projectAttr);
				break;
			case "string":
				eval('this.'+attributeName+' = "'+projectAttr+'"');
				break;
			}
			
		}
		
		this.metrics = {
			enabled: [],
			decode: function(parent, xml) {
				var children = xml.getElementsByTagName('metricenable');
				for (var i in children) { 
					if (isNaN(Number(i)) == true){break;}
					this.enabled.push(children[i].textContent);
				}
			},
			encode: function(root) {
				var node = root.createElement('metric');
				for (var i in this.enabled)
				{
					if (isNaN(Number(i)) == true){break;}
					var child = root.createElement('metricenable');
					child.textContent = this.enabled[i];
					node.appendChild(child);
				}
				return node;
			}
		};
		
		this.metrics.decode(this,setupNode.getElementsByTagName('metric')[0]);
		
		// Now process the survey node options
		var survey = setupNode.getElementsByTagName('survey');
		var surveySchema = specification.schema.getElementsByName('survey')[0];
		for (var i in survey) {
			if (isNaN(Number(i)) == true){break;}
			var location = survey[i].getAttribute('location');
			if (location == 'pre' || location == 'before')
			{
				if (this.preTest != null){this.errors.push("Already a pre/before test survey defined! Ignoring second!!");}
				else {
					this.preTest = new this.surveyNode();
					this.preTest.decode(this,survey[i],surveySchema);
				}
			} else if (location == 'post' || location == 'after') {
				if (this.postTest != null){this.errors.push("Already a post/after test survey defined! Ignoring second!!");}
				else {
					this.postTest = new this.surveyNode();
					this.postTest.decode(this,survey[i],surveySchema);
				}
			}
		}
		
		var interfaceNode = setupNode.getElementsByTagName('interface');
		if (interfaceNode.length > 1)
		{
			this.errors.push("Only one <interface> node in the <setup> node allowed! Others except first ingnored!");
		}
		this.interfaces = new this.interfaceNode();
		if (interfaceNode.length != 0)
		{
			interfaceNode = interfaceNode[0];
			this.interfaces.decode(this,interfaceNode,this.schema.getElementsByName('interface')[1]);
		}
		
		// Page tags
		var pageTags = projectXML.getElementsByTagName('page');
		var pageSchema = this.schema.getElementsByName('page')[0];
		for (var i=0; i<pageTags.length; i++)
		{
			var node = new this.page();
			node.decode(this,pageTags[i],pageSchema);
			this.pages.push(node);
		}
	};
	
	this.encode = function()
	{
		var root = document.implementation.createDocument(null,"waet");
		
		// Build setup node
		
		return root;
	};
	
	this.surveyNode = function() {
		this.location = null;
		this.options = [];
		this.schema = null;
		
		this.OptionNode = function() {
			this.type = undefined;
			this.schema = undefined;
			this.id = undefined;
			this.mandatory = undefined;
			this.statement = undefined;
			this.boxsize = undefined;
			this.options = [];
			this.min = undefined;
			this.max = undefined;
			this.step = undefined;
			
			this.decode = function(parent,child,schema)
			{
				this.schema = schema;
				var attributeMap = schema.getElementsByTagName('attribute');
				for (var i in attributeMap){
					if(isNaN(Number(i)) == true){break;}
					var attributeName = attributeMap[i].getAttribute('name') || attributeMap[i].getAttribute('ref');
					var projectAttr = child.getAttribute(attributeName);
					projectAttr = parent.processAttribute(projectAttr,attributeMap[i]);
					switch(typeof projectAttr)
					{
					case "number":
					case "boolean":
						eval('this.'+attributeName+' = '+projectAttr);
						break;
					case "string":
						eval('this.'+attributeName+' = "'+projectAttr+'"');
						break;
					}
				}
				this.statement = child.getElementsByTagName('statement')[0].textContent;
				if (this.type == "checkbox" || this.type == "radio") {
					var children = child.getElementsByTagName('option');
					if (children.length == null) {
						console.log('Malformed' +child.nodeName+ 'entry');
						this.statement = 'Malformed' +child.nodeName+ 'entry';
						this.type = 'statement';
					} else {
						this.options = [];
						for (var i in children)
						{
							if (isNaN(Number(i))==true){break;}
							this.options.push({
								name: children[i].getAttribute('name'),
								text: children[i].textContent
							});
						}
					}
				}
			};
			
			this.exportXML = function(root)
			{
				var node = root.createElement('surveyelement');
				node.setAttribute('type',this.type);
				var statement = root.createElement('statement');
				statement.textContent = this.statement;
				node.appendChild(statement);
				switch(this.type)
				{
				case "statement":
					break;
				case "question":
					node.id = this.id;
					node.setAttribute("mandatory",this.mandatory);
					node.setAttribute("boxsize",this.boxsize);
					break;
				case "number":
					node.id = this.id;
					node.setAttribute("mandatory",this.mandatory);
					node.setAttribute("min", this.min);
					node.setAttribute("max", this.max);
					node.setAttribute("step", this.step);
					break;
				case "checkbox":
				case "radio":
					node.id = this.id;
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
		this.decode = function(parent,xml,schema) {
			this.schema = schema;
			this.location = xml.getAttribute('location');
			if (this.location == 'before'){this.location = 'pre';}
			else if (this.location == 'after'){this.location = 'post';}
			var surveyentrySchema = schema.getElementsByTagName('element')[0];
			for (var i in xml.children)
			{
				if(isNaN(Number(i))==true){break;}
				var node = new this.OptionNode();
				node.decode(parent,xml.children[i],surveyentrySchema);
				this.options.push(node);
			}
		};
		this.encode = function(root) {
			var node = root.createElement('survey');
			node.setAttribute('location',this.location);
			for (var i=0; i<this.options.length; i++)
			{
				node.appendChild(this.options[i].exportXML());
			}
			return node;
		};
	};
	
	this.interfaceNode = function()
	{
		this.title = null;
		this.name = null;
		this.options = [];
		this.scales = [];
		this.schema = null;
		
		this.decode = function(parent,xml,schema) {
			this.schema = schema;
			this.name = xml.getAttribute('name');
			var titleNode = xml.getElementsByTagName('title');
			if (titleNode.length == 1)
			{
				this.title = titleNode[0].textContent;
			}
			var interfaceOptionNodes = xml.getElementsByTagName('interfaceoption');
			// Extract interfaceoption node schema
			var interfaceOptionNodeSchema = schema.getElementsByTagName('element');
			for (var i=0; i<interfaceOptionNodeSchema.length; i++) {
				if (interfaceOptionNodeSchema[i].getAttribute('name') == 'interfaceoption') {
					interfaceOptionNodeSchema = interfaceOptionNodeSchema[i];
					break;
				}
			}
			var attributeMap = interfaceOptionNodeSchema.getElementsByTagName('attribute');
			for (var i=0; i<interfaceOptionNodes.length; i++)
			{
				var ioNode = interfaceOptionNodes[i];
				var option = {};
				for (var j=0; j<attributeMap.length; j++)
				{
					var attributeName = attributeMap[j].getAttribute('name') || attributeMap[j].getAttribute('ref');
					var projectAttr = ioNode.getAttribute(attributeName);
					projectAttr = parent.processAttribute(projectAttr,attributeMap[j]);
					switch(typeof projectAttr)
					{
					case "number":
					case "boolean":
						eval('option.'+attributeName+' = '+projectAttr);
						break;
					case "string":
						eval('option.'+attributeName+' = "'+projectAttr+'"');
						break;
					}
				}
				this.options.push(option);
			}
			
			// Now the scales nodes
			var scaleParent = xml.getElementsByTagName('scales');
			if (scaleParent.length == 1) {
				scaleParent = scaleParent[0];
				for (var i=0; i<scaleParent.children.length; i++) {
					var child = scaleParent.children[i];
					this.scales.push({
						text: child.textContent,
						position: Number(child.getAttribute('position'))
					});
				}
			}
		};
		
		this.encode = function(root) {
			
		};
	};
	
	this.page = function() {
		this.presentedId = undefined;
		this.id = undefined;
		this.hostURL = undefined;
		this.randomiseOrder = undefined;
		this.loop = undefined;
		this.showElementComments = undefined;
		this.outsideReference = null;
		this.loudness = null;
		this.preTest = null;
		this.postTest = null;
		this.interfaces = [];
		this.commentBoxPrefix = "Comment on track";
		this.audioElements = [];
		this.commentQuestions = [];
		this.schema = null;
		
		this.decode = function(parent,xml,schema)
		{
			this.schema = schema;
			var attributeMap = this.schema.getElementsByTagName('attribute');
			for (var i=0; i<attributeMap.length; i++)
			{
				var attributeName = attributeMap[i].getAttribute('name') || attributeMap[i].getAttribute('ref');
				var projectAttr = xml.getAttribute(attributeName);
				projectAttr = parent.processAttribute(projectAttr,attributeMap[i]);
				switch(typeof projectAttr)
				{
				case "number":
				case "boolean":
					eval('this.'+attributeName+' = '+projectAttr);
					break;
				case "string":
					eval('this.'+attributeName+' = "'+projectAttr+'"');
					break;
				}
			}
			
			// Get the Comment Box Prefix
			var CBP = xml.getElementsByTagName('commentboxprefix');
			if (CBP.length != 0) {
				this.commentBoxPrefix = CBP[0].textContent;
			}
			
			// Now decode the interfaces
			var interfaceNode = xml.getElementsByTagName('interface');
			for (var i=0; i<interfaceNode.length; i++)
			{
				var node = new parent.interfaceNode();
				node.decode(this,interfaceNode[i],parent.schema.getElementsByName('interface')[1]);
				this.interfaces.push(node);
			}
			
			// Now process the survey node options
			var survey = xml.getElementsByTagName('survey');
			var surveySchema = parent.schema.getElementsByName('survey')[0];
			for (var i in survey) {
				if (isNaN(Number(i)) == true){break;}
				var location = survey[i].getAttribute('location');
				if (location == 'pre' || location == 'before')
				{
					if (this.preTest != null){this.errors.push("Already a pre/before test survey defined! Ignoring second!!");}
					else {
						this.preTest = new parent.surveyNode();
						this.preTest.decode(parent,survey[i],surveySchema);
					}
				} else if (location == 'post' || location == 'after') {
					if (this.postTest != null){this.errors.push("Already a post/after test survey defined! Ignoring second!!");}
					else {
						this.postTest = new parent.surveyNode();
						this.postTest.decode(parent,survey[i],surveySchema);
					}
				}
			}
			
			// Now process the audioelement tags
			var audioElements = xml.getElementsByTagName('audioelement');
			var audioElementSchema = parent.schema.getElementsByName('audioelement')[0];
			for (var i=0; i<audioElements.length; i++)
			{
				var node = new this.audioElementNode();
				node.decode(this,audioElements[i],audioElementSchema);
				this.audioElements.push(node);
			}
			
			// Now decode the commentquestions
			var commentQuestions = xml.getElementsByTagName('commentquestion');
			var commentQuestionSchema = parent.schema.getElementsByName('commentquestion')[0];
			for (var i=0; i<commentQuestions.length; i++)
			{
				var node = new this.commentQuestionNode();
				node.decode(parent,commentQuestions[i],commentQuestionSchema);
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
			if(this.loudness != null) {AHNode.setAttribute("loudness",this.loudness);}
			if(this.initialPosition != null) {
				AHNode.setAttribute("loudness",this.initialPosition*100);
				}
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
		
		this.commentQuestionNode = function() {
			this.id = null;
			this.type = undefined;
			this.options = [];
			this.statement = undefined;
			this.schema = null;
			this.decode = function(parent,xml,schema)
			{
				this.id = xml.id;
				this.type = xml.getAttribute('type');
				this.statement = xml.getElementsByTagName('statement')[0].textContent;
				var optNodes = xml.getElementsByTagName('option');
				for (var i=0; i<optNodes.length; i++)
				{
					var optNode = optNodes[i];
					this.options.push({
						name: optNode.getAttribute('name'),
						text: optNode.textContent
					});
				}
			};
			
			this.encode = function(root)
			{
				
			};
		};
		
		this.audioElementNode = function() {
			this.url = null;
			this.id = null;
			this.parent = null;
			this.type = null;
			this.marker = false;
			this.enforce = false;
			this.gain = 1.0;
			this.schema = null;
			this.parent = null;
			this.decode = function(parent,xml,schema)
			{
				this.schema = schema;
				this.parent = parent;
				var attributeMap = this.schema.getElementsByTagName('attribute');
				for (var i=0; i<attributeMap.length; i++)
				{
					var attributeName = attributeMap[i].getAttribute('name') || attributeMap[i].getAttribute('ref');
					var projectAttr = xml.getAttribute(attributeName);
					projectAttr = specification.processAttribute(projectAttr,attributeMap[i]);
					switch(typeof projectAttr)
					{
					case "number":
					case "boolean":
						eval('this.'+attributeName+' = '+projectAttr);
						break;
					case "string":
						eval('this.'+attributeName+' = "'+projectAttr+'"');
						break;
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
	};
}
			
function Interface(specificationObject) {
	// This handles the bindings between the interface and the audioEngineContext;
	this.specification = specificationObject;
	this.insertPoint = document.getElementById("topLevelBody");
	
	this.newPage = function(audioHolderObject,store)
	{
		audioEngineContext.newTestPage(store);
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
		loadTest(audioHolderObject,store);
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
		this.string.innerHTML = commentQuestion.statement;
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
		for (var optNode of commentQuestion.options)
		{
			var div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
			var input = document.createElement('input');
			input.type = 'radio';
			input.name = commentQuestion.id;
			input.setAttribute('setvalue',optNode.name);
			input.className = 'comment-radio';
			div.appendChild(input);
			this.inputs.appendChild(div);
			
			
			div = document.createElement('div');
			div.style.width = '80px';
			div.style.float = 'left';
			div.align = 'center';
			var span = document.createElement('span');
			span.textContent = optNode.text;
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
		if (element.type == 'question') {
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
		for (var ao of audioEngineContext.audioObjects)
		{
			if (ao.specification.type == "anchor")
			{
				if (ao.interfaceDOM.getValue() > (ao.specification.marker/100) && ao.specification.marker > 0) {
					// Anchor is not set below
					console.log('Anchor node not below marker value');
					alert('Please keep listening');
					return false;
				}
			}
		}
		return true;
	};
	
	this.checkHiddenReference = function()
	{
		for (var ao of audioEngineContext.audioObjects)
		{
			if (ao.specification.type == "reference")
			{
				if (ao.interfaceDOM.getValue() < (ao.specification.marker/100) && ao.specification.marker > 0) {
					// Anchor is not set below
					console.log('Reference node not below marker value');
					alert('Please keep listening');
					return false;
				}
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
			var time = object.buffer.buffer.duration;
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
			var str_start = "You have not completely listened to fragments ";
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
	this.checkAllMoved = function()
	{
		var str = "You have not moved ";
		var failed = [];
		for (var i in audioEngineContext.audioObjects)
		{
			if(audioEngineContext.audioObjects[i].metric.wasMoved == false && audioEngineContext.audioObjects[i].specification.type != 'outsidereference')
			{
				failed.push(audioEngineContext.audioObjects[i].id);
			}
		}
		if (failed.length == 0)
		{
			return true;
		} else if (failed.length == 1)
		{
			str += 'track '+failed[0];
		} else {
			str += 'tracks ';
			for (var i=0; i<failed.length-1; i++)
			{
				str += failed[i]+', ';
			}
			str += 'and '+failed[i];
		}
		str +='.';
		alert(str);
		console.log(str);
		return false;
	};
	this.checkAllPlayed = function()
	{
		var str = "You have not played ";
		var failed = [];
		for (var i in audioEngineContext.audioObjects)
		{
			if(audioEngineContext.audioObjects[i].metric.wasListenedTo == false)
			{
				failed.push(audioEngineContext.audioObjects[i].id);
			}
		}
		if (failed.length == 0)
		{
			return true;
		} else if (failed.length == 1)
		{
			str += 'track '+failed[0];
		} else {
			str += 'tracks ';
			for (var i=0; i<failed.length-1; i++)
			{
				str += failed[i]+', ';
			}
			str += 'and '+failed[i];
		}
		str +='.';
		alert(str);
		console.log(str);
		return false;
	};
}

function Storage()
{
	// Holds results in XML format until ready for collection
	this.globalPreTest = null;
	this.globalPostTest = null;
	this.testPages = [];
	this.document = document.implementation.createDocument(null,"waetresult");
	this.root = this.document.children[0];
	this.state = 0;
	
	this.initialise = function()
	{
		this.globalPreTest = new this.surveyNode(this,this.root,specification.preTest);
		this.globalPostTest = new this.surveyNode(this,this.root,specification.postTest);
	};
	
	this.createTestPageStore = function(specification)
	{
		var store = new this.pageNode(this,specification);
		this.testPages.push(store);
		return this.testPages[this.testPages.length-1];
	};
	
	this.surveyNode = function(parent,root,specification)
	{
		this.specification = specification;
		this.parent = parent;
		this.XMLDOM = this.parent.document.createElement('survey');
		this.XMLDOM.setAttribute('location',this.specification.location);
		for (var optNode of this.specification.options)
		{
			if (optNode.type != 'statement')
			{
				var node = this.parent.document.createElement('surveyresult');
				node.id = optNode.id;
				node.setAttribute('type',optNode.type);
				this.XMLDOM.appendChild(node);
			}
		}
		root.appendChild(this.XMLDOM);
		
		this.postResult = function(node)
		{
			// From popup: node is the popupOption node containing both spec. and results
			// ID is the position
			if (node.specification.type == 'statement'){return;}
			var surveyresult = this.parent.document.getElementById(node.specification.id);
			switch(node.specification.type)
			{
			case "number":
			case "question":
				var child = this.parent.document.createElement('response');
				child.textContent = node.response;
				surveyresult.appendChild(child);
				break;
			case "radio":
				var child = this.parent.document.createElement('response');
				child.setAttribute('name',node.response.name);
				child.textContent = node.response.text;
				surveyresult.appendChild(child);
				break;
			case "checkbox":
				for (var i=0; i<node.response.length; i++)
				{
					var checkNode = this.parent.document.createElement('response');
					checkNode.setAttribute('name',node.response.name);
					checkNode.setAttribute('checked',node.response.checked);
					surveyresult.appendChild(checkNode);
				}
				break;
			}
		};
	};
	
	this.pageNode = function(parent,specification)
	{
		// Create one store per test page
		this.specification = specification;
		this.parent = parent;
		this.XMLDOM = this.parent.document.createElement('page');
		this.XMLDOM.setAttribute('id',specification.id);
		this.XMLDOM.setAttribute('presentedId',specification.presentedId);
		this.preTest = new this.parent.surveyNode(parent,this.XMLDOM,specification.preTest);
		this.postTest = new this.parent.surveyNode(parent,this.XMLDOM,specification.postTest);
		
		// Add any page metrics
		var page_metric = this.parent.document.createElement('metric');
		this.XMLDOM.appendChild(page_metric);
		
		// Add the audioelement
		for (var element of this.specification.audioElements)
		{
			var aeNode = this.parent.document.createElement('audioelement');
			aeNode.id = element.id;
			aeNode.setAttribute('type',element.type);
			aeNode.setAttribute('url', element.url);
			aeNode.setAttribute('gain', element.gain);
			if (element.type == 'anchor' || element.type == 'reference')
			{
				if (element.marker > 0)
				{
					aeNode.setAttribute('marker',element.marker);
				}
			}
			var ae_metric = this.parent.document.createElement('metric');
			aeNode.appendChild(ae_metric); 
			this.XMLDOM.appendChild(aeNode);
		}
		
		// Add any commentQuestions
		for (var element of this.specification.commentQuestions)
		{
			var cqNode = this.parent.document.createElement('commentquestion');
			cqNode.id = element.id;
			cqNode.setAttribute('type',element.type);
			var statement = this.parent.document.createElement('statement');
			statement.textContent = cqNode.statement;
			cqNode.appendChild(statement);
			var response = this.parent.document.createElement('response');
			cqNode.appendChild(response);
			this.XMLDOM.appendChild(cqNode);
		}
		
		this.parent.root.appendChild(this.XMLDOM);
	};
	this.finish = function()
	{
		if (this.state == 0)
		{
			var projectDocument = specification.projectXML;
			projectDocument.setAttribute('file-name',url);
			this.root.appendChild(projectDocument);
			this.root.appendChild(returnDateNode());
			this.root.appendChild(interfaceContext.returnNavigator());
		}
		this.state = 1;
		return this.root;
	};
}

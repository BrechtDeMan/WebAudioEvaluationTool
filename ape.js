/**
 *  ape.js
 *  Create the APE interface
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

var currentState; // Keep track of the current state (pre/post test, which test, final test? first test?)
// preTest - In preTest state
// testRun-ID - In test running, test Id number at the end 'testRun-2'
// testRunPost-ID - Post test of test ID
// testRunPre-ID - Pre-test of test ID
// postTest - End of test, final submission!


// Once this is loaded and parsed, begin execution
loadInterface(projectXML);

function loadInterface(xmlDoc) {
	
	// Get the dimensions of the screen available to the page
	var width = window.innerWidth;
	var height = window.innerHeight;
	
	// The injection point into the HTML page
	var insertPoint = document.getElementById("topLevelBody");
	var testContent = document.createElement('div');
	testContent.id = 'testContent';
	
	
	// Decode parts of the xmlDoc that are needed
	// xmlDoc MUST already be parsed by jQuery!
	var xmlSetup = xmlDoc.find('setup');
	// Should put in an error function here incase of malprocessed or malformed XML
	
	// Extract the different test XML DOM trees
	 var audioHolders = xmlDoc.find('audioHolder');
	 audioHolders.each(function(index,element) {
	 	var repeatN = element.attributes['repeatCount'].value;
	 	for (var r=0; r<=repeatN; r++) {
	 		testXMLSetups[testXMLSetups.length] = element;
	 	}
	 });
	 
	 // New check if we need to randomise the test order
	 var randomise = xmlSetup.attributes['randomiseOrder'];
	 if (randomise != undefine) {
	 	randomise = Boolean(randomise.value);
	 } else {
	 	randomise = false;
	 }
	 if (randomise)
	 {
	 	// TODO: Implement Randomisation!!
	 }
	 
	
	// Create the top div for the Title element
	var titleAttr = xmlSetup[0].attributes['title'];
	var title = document.createElement('div');
	title.className = "title";
	title.align = "center";
	var titleSpan = document.createElement('span');
	
	// Set title to that defined in XML, else set to default
	if (titleAttr != undefined) {
		titleSpan.innerHTML = titleAttr.value;
	} else {
		titleSpan.innerHTML =  'APE Tool';
	}
	// Insert the titleSpan element into the title div element.
	title.appendChild(titleSpan);
	
	// Store the return URL path in global projectReturn
	projectReturn = xmlSetup[0].attributes['projectReturn'].value;
	
	// Create Interface buttons!
	var interfaceButtons = document.createElement('div');
	interfaceButtons.id = 'interface-buttons';
	
	// MANUAL DOWNLOAD POINT
	// If project return is null, this MUST be specified as the location to create the download link
	var downloadPoint = document.createElement('div');
	downloadPoint.id = 'download-point';
	
	// Create playback start/stop points
	var playback = document.createElement("button");
	playback.innerHTML = 'Start';
	// onclick function. Check if it is playing or not, call the correct function in the
	// audioEngine, change the button text to reflect the next state.
	playback.onclick = function() {
		if (audioEngineContext.status == 0) {
			audioEngineContext.play();
			this.innerHTML = 'Stop';
		} else {
			audioEngineContext.stop();
			this.innerHTML = 'Start';
		}
	};
	// Create Submit (save) button
	var submit = document.createElement("button");
	submit.innerHTML = 'Submit';
	submit.onclick = buttonSubmitClick;
	// Append the interface buttons into the interfaceButtons object.
	interfaceButtons.appendChild(playback);
	interfaceButtons.appendChild(submit);
	interfaceButtons.appendChild(downloadPoint);
	
	// Now create the slider and HTML5 canvas boxes
	
	// Create the div box to center align
	var sliderBox = document.createElement('div');
	sliderBox.className = 'sliderCanvasDiv';
	sliderBox.id = 'sliderCanvasHolder';
	sliderBox.align = 'center';
	
	// Create the slider box to hold the slider elements
	var canvas = document.createElement('div');
	canvas.id = 'slider';
	// Must have a known EXACT width, as this is used later to determine the ratings
	canvas.style.width = width - 100 +"px";
	canvas.align = "left";
	sliderBox.appendChild(canvas);
	
	// Global parent for the comment boxes on the page
	var feedbackHolder = document.createElement('div');
	feedbackHolder.id = 'feedbackHolder';
	
	testContent.style.zIndex = 1;
	insertPoint.innerHTML = null; // Clear the current schema
	
	// Create pre and post test questions
	var blank = document.createElement('div');
	blank.className = 'testHalt';
	
	var popupHolder = document.createElement('div');
	popupHolder.id = 'popupHolder';
	popupHolder.className = 'popupHolder';
	popupHolder.style.position = 'absolute';
	popupHolder.style.left = (window.innerWidth/2)-250 + 'px';
	popupHolder.style.top = (window.innerHeight/2)-125 + 'px';
	insertPoint.appendChild(popupHolder);
	insertPoint.appendChild(blank);
	hidePopup();
	
	var preTest = xmlSetup.find('PreTest');
	var postTest = xmlSetup.find('PostTest');
	preTest = preTest[0];
	postTest = postTest[0];
	
	currentState = 'preTest';
	
	// Create Pre-Test Box
	if (preTest != undefined && preTest.children.length >= 1)
	{
		showPopup();
		preTestPopupStart(preTest);
	}
	
	// Inject into HTML
	testContent.appendChild(title); // Insert the title
	testContent.appendChild(interfaceButtons);
	testContent.appendChild(sliderBox);
	testContent.appendChild(feedbackHolder);
	insertPoint.appendChild(testContent);

	// Load the full interface
	
}

function loadTest(id)
{
	// Used to load a specific test page
	var textXML = testXMLSetups[id];
	
	var feedbackHolder = document.getElementById('feedbackHolder');
	var canvas = document.getElementById('slider');
	feedbackHolder.innerHTML = null;
	canvas.innerHTML = null;

	// Extract the hostURL attribute. If not set, create an empty string.
	var hostURL = textXML.attributes['hostURL'];
	if (hostURL == undefined) {
		hostURL = "";
	} else {
		hostURL = hostURL.value;
	}
	// Extract the sampleRate. If set, convert the string to a Number.
	var hostFs = textXML.attributes['sampleRate'];
	if (hostFs != undefined) {
		hostFs = Number(hostFs.value);
	}
	
	/// CHECK FOR SAMPLE RATE COMPATIBILITY
	if (hostFs != undefined) {
		if (Number(hostFs) != audioContext.sampleRate) {
			var errStr = 'Sample rates do not match! Requested '+Number(hostFs)+', got '+audioContext.sampleRate+'. Please set the sample rate to match before completing this test.';
			alert(errStr);
			return;
		}
	}
	// Find all the audioElements from the audioHolder
	var audioElements = $(textXML).find('audioElements');
	audioElements.each(function(index,element){
		// Find URL of track
		// In this jQuery loop, variable 'this' holds the current audioElement.
		
		// Now load each audio sample. First create the new track by passing the full URL
		var trackURL = hostURL + this.attributes['url'].value;
		audioEngineContext.newTrack(trackURL);
		// Create document objects to hold the comment boxes
		var trackComment = document.createElement('div');
		trackComment.className = 'comment-div';
		// Create a string next to each comment asking for a comment
		var trackString = document.createElement('span');
		trackString.innerHTML = 'Comment on track '+index;
		// Create the HTML5 comment box 'textarea'
		var trackCommentBox = document.createElement('textarea');
		trackCommentBox.rows = '4';
		trackCommentBox.cols = '100';
		trackCommentBox.name = 'trackComment'+index;
		trackCommentBox.className = 'trackComment';
		var br = document.createElement('br');
		// Add to the holder.
		trackComment.appendChild(trackString);
		trackComment.appendChild(br);
		trackComment.appendChild(trackCommentBox);
		feedbackHolder.appendChild(trackComment);
		
		// Create a slider per track
		
		var trackSliderObj = document.createElement('div');
		trackSliderObj.className = 'track-slider';
		trackSliderObj.id = 'track-slider-'+index;
		// Distribute it randomnly
		var w = window.innerWidth - 100;
		w = Math.random()*w;
		trackSliderObj.style.left = Math.floor(w)+50+'px';
		trackSliderObj.innerHTML = '<span>'+index+'</span>';
		trackSliderObj.draggable = true;
		trackSliderObj.ondragend = dragEnd;
		
		// Onclick, switch playback to that track
		trackSliderObj.onclick = function() {
			// Get the track ID from the object ID
			var id = Number(this.id.substr(13,2)); // Maximum theoretical tracks is 99!
			audioEngineContext.selectedTrack(id);
		};
		
		canvas.appendChild(trackSliderObj);
	});
	
	// Now process any pre-test commands
	
	var preTest = $(testXMLSetups[id]).find('PreTest')[0];
	if (preTest.children.length > 0)
	{
		currentState = 'testRunPre-'+id;
		preTestPopupStart(preTest);
		showPopup();
	} else {
		currentState = 'testRun-'+id;
	}
}

function preTestPopupStart(preTest)
{
	var popupHolder = document.getElementById('popupHolder');
	popupHolder.innerHTML = null;
	// Parse the first box
	var preTestOption = document.createElement('div');
	preTestOption.id = 'preTest';
	preTestOption.style.marginTop = '25px';
	preTestOption.align = "center";
	var child = preTest.children[0];
	if (child.nodeName == 'statement')
	{
		preTestOption.innerHTML = '<span>'+child.innerHTML+'</span>';
	} else if (child.nodeName == 'question')
	{
		var questionId = child.attributes['id'].value;
		var textHold = document.createElement('span');
		textHold.innerHTML = child.innerHTML;
		textHold.id = questionId + 'response';
		var textEnter = document.createElement('textarea');
		preTestOption.appendChild(textHold);
		preTestOption.appendChild(textEnter);
	}
	var nextButton = document.createElement('button');
	nextButton.className = 'popupButton';
	nextButton.value = '0';
	nextButton.innerHTML = 'Next';
	nextButton.onclick = popupButtonClick;
	
	popupHolder.appendChild(preTestOption);
	popupHolder.appendChild(nextButton);
}

function popupButtonClick()
{
	// Global call from the 'Next' button click
	if (currentState == 'preTest')
	{
		// At the start of the preTest routine!
		var xmlTree = projectXML.find('setup');
		var preTest = xmlTree.find('PreTest')[0];
		this.value = preTestButtonClick(preTest,this.value);
	} else if (currentState.substr(0,10) == 'testRunPre')
	{
		//Specific test pre-test
		var testId = currentState.substr(11,currentState.length-10);
		var preTest = $(testXMLSetups[testId]).find('PreTest')[0];
		this.value = preTestButtonClick(preTest,this.value);
	} else if (currentState.substr(0,11) == 'testRunPost')
	{
		// Specific test post-test
		var testId = currentState.substr(12,currentState.length-11);
		var preTest = $(testXMLSetups[testId]).find('PostTest')[0];
		this.value = preTestButtonClick(preTest,this.value);
	} else if (currentState == 'postTest')
	{
		// At the end of the test, running global post test
		var xmlTree = projectXML.find('setup');
		var PostTest = xmlTree.find('PostTest')[0];
		this.value = preTestButtonClick(PostTest,this.value);
	}
}

function preTestButtonClick(preTest,index)
{
	// Called on click of pre-test button
	// Need to find and parse preTest again!
	var preTestOption = document.getElementById('preTest');
	// Check if current state is a question!
	if (preTest.children[index].nodeName == 'question') {
		var questionId = preTest.children[index].attributes['id'].value;
		var questionHold = document.createElement('comment');
		var questionResponse = document.getElementById(questionId + 'response');
		questionHold.id = questionId;
		questionHold.innerHTML = questionResponse.value;
		if (currentState == 'preTest') {
			preTestQuestions.appendChild(questionHold);
		} else if (currentState = 'postTest') {  
			postTestQuestions.appendChild(questionHold);
		}
	}
	index++;
	if (index < preTest.children.length)
	{
		// More to process
		var child = preTest.children[index];
		if (child.nodeName == 'statement')
		{
			preTestOption.innerHTML = '<span>'+child.innerHTML+'</span>';
		} else if (child.nodeName == 'question')
		{
			var textHold = document.createElement('span');
			textHold.innerHTML = child.innerHTML;
			var textEnter = document.createElement('textarea');
			textEnter.id = child.attributes['id'].value + 'response';
			var br = document.createElement('br');
			preTestOption.innerHTML = null;
			preTestOption.appendChild(textHold);
			preTestOption.appendChild(br);
			preTestOption.appendChild(textEnter);
		}
	} else {
		// Time to clear
		preTestOption.innerHTML = null;
		if (currentState != 'postTest') {
			hidePopup();
			// Progress the state!
			advanceState();
		} else {
			a = createProjectSave(projectReturn);
			preTestOption.appendChild(a);
		}
	}
	return index;
}

function showPopup()
{
	var popupHolder = document.getElementById('popupHolder');
	popupHolder.style.zIndex = 3;
	popupHolder.style.visibility = 'visible';
	var blank = document.getElementsByClassName('testHalt')[0];
	blank.style.zIndex = 2;
	blank.style.visibility = 'visible';
}

function hidePopup()
{
	var popupHolder = document.getElementById('popupHolder');
	popupHolder.style.zIndex = -1;
	popupHolder.style.visibility = 'hidden';
	var blank = document.getElementsByClassName('testHalt')[0];
	blank.style.zIndex = -2;
	blank.style.visibility = 'hidden';
}

function dragEnd(ev) {
	// Function call when a div has been dropped
	var slider = document.getElementById('slider');
	if (ev.x >= 50 && ev.x < window.innerWidth-50) {
		this.style.left = (ev.x)+'px';
	} else {
		if (ev.x<50) {
			this.style.left = '50px';
		} else {
			this.style.left = window.innerWidth-50 + 'px';
		}
	}
}

function advanceState()
{
	console.log(currentState);
	if (currentState == 'preTest')
	{
		// End of pre-test, begin the test
		loadTest(0);
	} else if (currentState.substr(0,10) == 'testRunPre')
	{
		// Start the test
		var testId = currentState.substr(11,currentState.length-10);
		currentState = 'testRun-'+testId;
	} else if (currentState.substr(0,11) == 'testRunPost')
	{
		var testId = currentState.substr(12,currentState.length-11);
		testEnded(testId);
	} else if (currentState.substr(0,7) == 'testRun')
	{
		var testId = currentState.substr(8,currentState.length-7);
		// Check if we have any post tests to perform
		var postXML = $(testXMLSetups[testId]).find('PostTest')[0];
		if (postXML.children.length > 0)
		{
			currentState = 'testRunPost-'+testId; 
			showPopup();
			preTestPopupStart(postXML);
		}
		else {
		
		
			// No post tests, check if we have another test to perform instead
			testEnded(testId);
		}
	}
	console.log(currentState);
}

function testEnded(testId)
{
	var xmlDoc = interfaceXMLSave();
	testResultsHolders;
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
		showPopup();
		preTestPopupStart(postTest);
	}
}

function buttonSubmitClick()
{
	// This function is called when the submit button is clicked. Will check for any further tests to perform, or any post-test options
	if (currentState.substr(0,7) == 'testRun')
	{
		advanceState();
	}
}

function pageXMLSave(testId)
{
	// Saves a specific test page
	var xmlDoc = document.createElement("AudioHolder");
	var testXML = testXMLSetups[testId];
	xmlDoc.id = testXML.id;
	xmlDoc.repeatCount = testXML.attributes['repeatCount'].value;
	
}

// Only other global function which must be defined in the interface class. Determines how to create the XML document.
function interfaceXMLSave(){
	// Create the XML string to be exported with results
	var xmlDoc = document.createElement("BrowserEvaluationResult");
	var trackSliderObjects = document.getElementsByClassName('track-slider');
	var commentObjects = document.getElementsByClassName('trackComment');
	var rateMin = 50;
	var rateMax = window.innerWidth-50;
	for (var i=0; i<trackSliderObjects.length; i++)
	{
		var trackObj = document.createElement("audioElement");
		trackObj.id = i;
		trackObj.url = audioEngineContext.audioObjects[i].url;
		var slider = document.createElement("Rating");
		var rate = Number(trackSliderObjects[i].style.left.substr(0,trackSliderObjects[i].style.left.length-2));
		rate = (rate-rateMin)/rateMax;
		slider.innerHTML = Math.floor(rate*100);
		var comment = document.createElement("Comment");
		comment.innerHTML = commentObjects[i].value;
		trackObj.appendChild(slider);
		trackObj.appendChild(comment);
		xmlDoc.appendChild(trackObj);
	}
	
	// Append Pre/Post Questions
	xmlDoc.appendChild(preTestQuestions);
	xmlDoc.appendChild(postTestQuestions);
	
	return xmlDoc;
}


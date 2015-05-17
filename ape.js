/**
 *  ape.js
 *  Create the APE interface
 */

var currentState; // Keep track of the current state (pre/post test, which test, final test? first test?)
// preTest - In preTest state
// testRun-ID - In test running, test Id number at the end 'testRun-2'
// testRunPost-ID - Post test of test ID
// testRunPre-ID - Pre-test of test ID
// postTest - End of test, final submission!


// Create empty array to log whether different samples have been played
var hasBeenPlayed = []; // HERE?


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
	var randomise = xmlSetup[0].attributes['randomiseOrder'];
	if (randomise != undefined) {
		randomise = Boolean(randomise.value);
	} else {
		randomise = false;
	}
	if (randomise)
	{
 		testXMLSetups = randomiseOrder(testXMLSetups);
	}
	 
	// Obtain the metrics enabled
	var metricNode = xmlSetup.find('Metric');
	var metricNode = metricNode.find('metricEnable');
	metricNode.each(function(index,node){
		var enabled = node.textContent;
		switch(enabled)
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
		case 'elementInitalPosition':
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
	
	// Create APE specific metric functions
	audioEngineContext.metric.initialiseTest = function()
	{
		var sliders = document.getElementsByClassName('track-slider');
		for (var i=0; i<sliders.length; i++)
		{
			audioEngineContext.audioObjects[i].metric.initialised(convSliderPosToRate(i));
		}
	};
	
	audioEngineContext.metric.sliderMoveStart = function(id)
	{
		if (this.data == -1)
		{
			this.data = id;
		} else {
			console.log('ERROR: Metric tracker detecting two moves!');
			this.data = -1;
		}
	};
	audioEngineContext.metric.sliderMoved = function()
	{
		var time = audioEngineContext.timer.getTestTime();
		var id = this.data;
		this.data = -1;
		var position = convSliderPosToRate(id);
		if (audioEngineContext.timer.testStarted)
		{
			audioEngineContext.audioObjects[id].metric.moved(time,position);
		}
	};
	
	audioEngineContext.metric.sliderPlayed = function(id)
	{
		var time = audioEngineContext.timer.getTestTime();
		if (audioEngineContext.timer.testStarted)
		{
			if (this.lastClicked >= 0)
			{
				audioEngineContext.audioObjects[this.lastClicked].metric.listening(time);
			}
			this.lastClicked = id;
			audioEngineContext.audioObjects[id].metric.listening(time);
		}
	};
	
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
		titleSpan.innerHTML =  'Listening test';
	}
	// Insert the titleSpan element into the title div element.
	title.appendChild(titleSpan);
	
	var pagetitle = document.createElement('div');
	pagetitle.className = "pageTitle";
	pagetitle.align = "center";
	var titleSpan = document.createElement('span');
	titleSpan.id = "pageTitle";
	pagetitle.appendChild(titleSpan);
	
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
	playback.innerHTML = 'Stop';
	playback.id = 'playback-button';
	// onclick function. Check if it is playing or not, call the correct function in the
	// audioEngine, change the button text to reflect the next state.
	playback.onclick = function() {
		if (audioEngineContext.status == 1) {
			audioEngineContext.stop();
			this.innerHTML = 'Stop';
		}
	};
	// Create Submit (save) button
	var submit = document.createElement("button");
	submit.innerHTML = 'Submit';
	submit.onclick = buttonSubmitClick;
	submit.id = 'submit-button';
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
	
	// Create the div to hold any scale objects
	var scale = document.createElement('div');
	scale.className = 'sliderScale';
	scale.id = 'sliderScaleHolder';
	scale.align = 'left';
	sliderBox.appendChild(scale);
	
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
	testContent.appendChild(pagetitle);
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
	
	// Setup question title
	var interfaceObj = $(textXML).find('interface');
	var titleNode = interfaceObj.find('title');
	if (titleNode[0] != undefined)
	{
		document.getElementById('pageTitle').textContent = titleNode[0].textContent;
	}
	var positionScale = canvas.style.width.substr(0,canvas.style.width.length-2);
	var offset = 50-8;  // Half the offset of the slider (window width -100) minus the body padding of 8
	// TODO: AUTOMATE ABOVE!!
	var scale = document.getElementById('sliderScaleHolder');
	scale.innerHTML = null;
	interfaceObj.find('scale').each(function(index,scaleObj){
		var position = Number(scaleObj.attributes['position'].value)*0.01;
		var pixelPosition = (position*positionScale)+offset;
		var scaleDOM = document.createElement('span');
		scaleDOM.textContent = scaleObj.textContent;
		scale.appendChild(scaleDOM);
		scaleDOM.style.left = Math.floor((pixelPosition-($(scaleDOM).width()/2)))+'px';
	});

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
	
	var commentShow = textXML.attributes['elementComments'];
	if (commentShow != undefined) {
		if (commentShow.value == 'false') {commentShow = false;}
		else {commentShow = true;}
	} else {commentShow = true;}
	
	var loopPlayback = textXML.attributes['loop'];
	if (loopPlayback != undefined)
	{
		loopPlayback = loopPlayback.value;
		if (loopPlayback == 'true') {
			loopPlayback = true;
		} else {
			loopPlayback = false;
		}
	} else {
		loopPlayback = false;
	}
	audioEngineContext.loopPlayback = loopPlayback;
	
	// Create AudioEngine bindings for playback
	if (loopPlayback) {
		audioEngineContext.play = function() {
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
		
		audioEngineContext.stop = function() {
			// Send stop and reset command to all playback buffers
			if (this.status == 1) {
				if (this.loopPlayback) {
					for (var i=0; i<this.audioObjects.length; i++)
					{
						this.audioObjects[i].stop();
					}
				}
				this.status = 0;
			}
		};
		
		audioEngineContext.selectedTrack = function(id) {
			for (var i=0; i<this.audioObjects.length; i++)
			{
				if (id == i) {
					this.audioObjects[i].outputGain.gain.value = 1.0;
				} else {
					this.audioObjects[i].outputGain.gain.value = 0.0;
				}
			}
		};
	} else {
		audioEngineContext.play = function() {
			// Send play command to all playback buffers for synchronised start
			// Also start timer callbacks to detect if playback has finished
			if (this.status == 0) {
				this.timer.startTest();
				this.status = 1;
			}
		};
		
		audioEngineContext.stop = function() {
			// Send stop and reset command to all playback buffers
			if (this.status == 1) {
				for (var i=0; i<this.audioObjects.length; i++)
				{
					this.audioObjects[i].stop();
				}
				this.status = 0;
			}
		};
		
		audioEngineContext.selectedTrack = function(id) {
			for (var i=0; i<this.audioObjects.length; i++)
			{
				this.audioObjects[i].outputGain.gain.value = 0.0;
				this.audioObjects[i].stop();
			}
			if (this.status == 1) {
				this.audioObjects[id].outputGain.gain.value = 1.0;
				this.audioObjects[id].play(audioContext.currentTime+0.01);
			}
		};
	}
	
	currentTestHolder = document.createElement('audioHolder');
	currentTestHolder.id = textXML.id;
	currentTestHolder.repeatCount = textXML.attributes['repeatCount'].value;
	var currentPreTestHolder = document.createElement('preTest');
	var currentPostTestHolder = document.createElement('postTest');
	currentTestHolder.appendChild(currentPreTestHolder);
	currentTestHolder.appendChild(currentPostTestHolder);
	
	var randomise = textXML.attributes['randomiseOrder'];
	if (randomise != undefined) {randomise = randomise.value;}
	else {randomise = false;}
	
	var audioElements = $(textXML).find('audioElements');
	currentTrackOrder = [];
	audioElements.each(function(index,element){
		// Find any blind-repeats
		// Not implemented yet, but just in case
		currentTrackOrder[index] = element;
	});
	if (randomise) {
		currentTrackOrder = randomiseOrder(currentTrackOrder);
	}
	
	// Delete any previous audioObjects associated with the audioEngine
	audioEngineContext.audioObjects = [];
	
	// Find all the audioElements from the audioHolder
	$(currentTrackOrder).each(function(index,element){
		// Find URL of track
		// In this jQuery loop, variable 'this' holds the current audioElement.
		
		// Now load each audio sample. First create the new track by passing the full URL
		var trackURL = hostURL + this.attributes['url'].value;
		audioEngineContext.newTrack(trackURL);
		
		if (commentShow) {
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
		}
		
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
		trackSliderObj.ondragstart = function()
		{
			var id = Number(this.id.substr(13,2)); // Maximum theoretical tracks is 99!
			audioEngineContext.metric.sliderMoveStart(id);
		};
		
		// Onclick, switch playback to that track
		trackSliderObj.onclick = function() {
			// Get the track ID from the object ID
			var id = Number(this.id.substr(13,2)); // Maximum theoretical tracks is 99!
			audioEngineContext.metric.sliderPlayed(id);
			audioEngineContext.selectedTrack(id);
            // Currently playing track red, rest green
            document.getElementById('track-slider-'+index).style.backgroundColor = "#FF0000";
            for (var i = 0; i<$(currentTrackOrder).length; i++)
            {
                if (i!=index) // Make all other sliders green
                {
                    document.getElementById('track-slider-'+i).style.backgroundColor = "rgb(100,200,100)";
                }
                              
            }
            audioEngineContext.play();
            hasBeenPlayed[index] = true; // mark as played
		};
		
		canvas.appendChild(trackSliderObj);
        
        // Add corresponding element to array to check whether sound has been played
        hasBeenPlayed.push(false);
	});
	
	// Append any commentQuestion boxes
	var commentQuestions = $(textXML).find('CommentQuestion');
	$(commentQuestions).each(function(index,element) {
		// Create document objects to hold the comment boxes
		var trackComment = document.createElement('div');
		trackComment.className = 'comment-div commentQuestion';
		trackComment.id = element.attributes['id'].value;
		// Create a string next to each comment asking for a comment
		var trackString = document.createElement('span');
		trackString.innerHTML = element.textContent;
		// Create the HTML5 comment box 'textarea'
		var trackCommentBox = document.createElement('textarea');
		trackCommentBox.rows = '4';
		trackCommentBox.cols = '100';
		trackCommentBox.name = 'commentQuestion'+index;
		trackCommentBox.className = 'trackComment';
		var br = document.createElement('br');
		// Add to the holder.
		trackComment.appendChild(trackString);
		trackComment.appendChild(br);
		trackComment.appendChild(trackCommentBox);
		feedbackHolder.appendChild(trackComment);
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
		var mandatory = preTest.children[index].attributes['mandatory'];
		if (mandatory != undefined){
			if (mandatory.value == 'true') {mandatory = true;}
			else {mandatory = false;}
		} else {mandatory = false;}
		if (mandatory == true && questionResponse.value.length == 0) {
			return index;
		}
		questionHold.id = questionId;
		questionHold.innerHTML = questionResponse.value;
		postPopupResponse(questionHold);
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

function postPopupResponse(response)
{
	if (currentState == 'preTest') {
		preTestQuestions.appendChild(response);
	} else if (currentState == 'postTest') {  
		postTestQuestions.appendChild(response);
	} else {
		// Inside a specific test
		if (currentState.substr(0,10) == 'testRunPre') {
			// Pre Test
			var store = $(currentTestHolder).find('preTest');
		} else {
			// Post Test
			var store = $(currentTestHolder).find('postTest');
		}
		store[0].appendChild(response);
	}
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
	var w = slider.style.width;
	w = Number(w.substr(0,w.length-2));
	var x = ev.x;
	if (x >= 42 && x < w+42) {
		this.style.left = (x)+'px';
	} else {
		if (x<42) {
			this.style.left = '42px';
		} else {
			this.style.left = (w+42) + 'px';
		}
	}
	audioEngineContext.metric.sliderMoved();
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
		if (postXML == undefined) {
			testEnded(testId);
		}
		else if (postXML.children.length > 0)
		{
			currentState = 'testRunPost-'+testId; 
			showPopup();
			preTestPopupStart(postXML);
		}
		else {
		
		
			// No post tests, check if we have another test to perform instead
			
		}
	}
	console.log(currentState);
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
		showPopup();
		preTestPopupStart(postTest);
	}
}

function buttonSubmitClick() // TODO: Only when all songs have been played!
{
    if (hasBeenPlayed.indexOf(false)==-1)
        {
        if (audioEngineContext.status == 1) {
            var playback = document.getElementById('playback-button');
            playback.click();
        // This function is called when the submit button is clicked. Will check for any further tests to perform, or any post-test options
        } else
        {
            if (audioEngineContext.timer.testStarted == false)
            {
                alert('You have not started the test! Please press start to begin the test!');
                return;
            }
        }
        if (currentState.substr(0,7) == 'testRun')
        {
            hasBeenPlayed = []; // clear array to prepare for next test
            audioEngineContext.timer.stopTest();
            advanceState();
        }
    } else // if a fragment has not been played yet
    {
        alert('You have not played fragment ' + hasBeenPlayed.indexOf(false) + ' yet. Please listen, rate and comment all samples before submitting.');
        return;
    }
}

function convSliderPosToRate(id)
{
	var w = document.getElementById('slider').style.width;
	var maxPix = w.substr(0,w.length-2);
	var slider = document.getElementsByClassName('track-slider')[id];
	var pix = slider.style.left;
	pix = pix.substr(0,pix.length-2);
	var rate = (pix-42)/maxPix;
	return rate;
}

function pageXMLSave(testId)
{
	// Saves a specific test page
	var xmlDoc = currentTestHolder;
	// Check if any session wide metrics are enabled
	
	var commentShow = testXMLSetups[testId].attributes['elementComments'];
	if (commentShow != undefined) {
		if (commentShow.value == 'false') {commentShow = false;}
		else {commentShow = true;}
	} else {commentShow = true;}
	
	var metric = document.createElement('metric');
	if (audioEngineContext.metric.enableTestTimer)
	{
		var testTime = document.createElement('metricResult');
		testTime.id = 'testTime';
		testTime.textContent = audioEngineContext.timer.testDuration;
		metric.appendChild(testTime);
	}
	xmlDoc.appendChild(metric);
	var trackSliderObjects = document.getElementsByClassName('track-slider');
	var commentObjects = document.getElementsByClassName('comment-div');
	for (var i=0; i<trackSliderObjects.length; i++) 
	{
		var audioElement = document.createElement('audioElement');
		audioElement.id = currentTrackOrder[i].attributes['id'].value;
		audioElement.url = currentTrackOrder[i].attributes['url'].value;
		var value = document.createElement('value');
		value.innerHTML = convSliderPosToRate(i);
		if (commentShow) {
			var comment = document.createElement("comment");
			var question = document.createElement("question");
			var response = document.createElement("response");
			question.textContent = commentObjects[i].children[0].textContent;
			response.textContent = commentObjects[i].children[2].value;
			comment.appendChild(question);
			comment.appendChild(response);
			audioElement.appendChild(comment);
		}
		audioElement.appendChild(value);
		// Check for any per element metrics
		var metric = document.createElement('metric');
		var elementMetric = audioEngineContext.audioObjects[i].metric;
		if (audioEngineContext.metric.enableElementTimer) {
			var elementTimer = document.createElement('metricResult');
			elementTimer.id = 'elementTimer';
			elementTimer.textContent = elementMetric.listenedTimer;
			metric.appendChild(elementTimer);
		}
		if (audioEngineContext.metric.enableElementTracker) {
			var elementTrackerFull = document.createElement('metricResult');
			elementTrackerFull.id = 'elementTrackerFull';
			var data = elementMetric.movementTracker;
			for (var k=0; k<data.length; k++)
			{
				var timePos = document.createElement('timePos');
				timePos.id = k;
				var time = document.createElement('time');
				time.textContent = data[k][0];
				var position = document.createElement('position');
				position.textContent = data[k][1];
				timePos.appendChild(time);
				timePos.appendChild(position);
				elementTrackerFull.appendChild(timePos);
			}
			metric.appendChild(elementTrackerFull);
		}
		if (audioEngineContext.metric.enableElementInitialPosition) {
			var elementInitial = document.createElement('metricResult');
			elementInitial.id = 'elementInitialPosition';
			elementInitial.textContent = elementMetric.initialPosition;
			metric.appendChild(elementInitial);
		}
		if (audioEngineContext.metric.enableFlagListenedTo) {
			var flagListenedTo = document.createElement('metricResult');
			flagListenedTo.id = 'elementFlagListenedTo';
			flagListenedTo.textContent = elementMetric.wasListenedTo;
			metric.appendChild(flagListenedTo);
		}
		if (audioEngineContext.metric.enableFlagMoved) {
			var flagMoved = document.createElement('metricResult');
			flagMoved.id = 'elementFlagMoved';
			flagMoved.textContent = elementMetric.wasMoved;
			metric.appendChild(flagMoved);
		}
		if (audioEngineContext.metric.enableFlagComments) {
			var flagComments = document.createElement('metricResult');
			flagComments.id = 'elementFlagComments';
			if (response.textContent.length == 0) {flag.textContent = 'false';}
			else {flag.textContet = 'true';}
			metric.appendChild(flagComments);
		}
		audioElement.appendChild(metric);
		xmlDoc.appendChild(audioElement);
	}
	var commentQuestion = document.getElementsByClassName('commentQuestion');
	for (var i=0; i<commentQuestion.length; i++)
	{
		var cqHolder = document.createElement('CommentQuestion');
		var comment = document.createElement('comment');
		var question = document.createElement('question');
		cqHolder.id = commentQuestion[i].id;
		comment.textContent = commentQuestion[i].children[2].value;
		question.textContent = commentQuestion[i].children[0].textContent;
		cqHolder.appendChild(question);
		cqHolder.appendChild(comment);
		xmlDoc.appendChild(cqHolder);
	}
	testResultsHolders[testId] = xmlDoc;
}

// Only other global function which must be defined in the interface class. Determines how to create the XML document.
function interfaceXMLSave(){
	// Create the XML string to be exported with results
	var xmlDoc = document.createElement("BrowserEvaluationResult");
	for (var i=0; i<testResultsHolders.length; i++)
	{
		xmlDoc.appendChild(testResultsHolders[i]);
	}
	// Append Pre/Post Questions
	xmlDoc.appendChild(preTestQuestions);
	xmlDoc.appendChild(postTestQuestions);
	
	return xmlDoc;
}
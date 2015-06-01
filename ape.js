/**
 *  ape.js
 *  Create the APE interface
 */

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
	
	// Create pre and post test questions
	
	var preTest = xmlSetup.find('PreTest');
	var postTest = xmlSetup.find('PostTest');
	preTest = preTest[0];
	postTest = postTest[0];
	
	if (preTest == undefined) {preTest = document.createElement("preTest");}
	if (postTest == undefined){postTest= document.createElement("postTest");}
	
	testState.stateMap.push(preTest);
	
	// Extract the different test XML DOM trees
	var audioHolders = xmlDoc.find('audioHolder');
	var testXMLSetups = [];
	audioHolders.each(function(index,element) {
		var repeatN = element.attributes['repeatCount'].value;
		for (var r=0; r<=repeatN; r++) {
			testXMLSetups.push(element);
		}
	});
	 
	// New check if we need to randomise the test order
	var randomise = xmlSetup[0].attributes['randomiseOrder'];
	if (randomise != undefined) {
		if (randomise.value === 'true'){
			randomise = true;
		} else {
			randomise = false;
		}
	} else {
		randomise = false;
	}
	
	if (randomise)
	{
 		testXMLSetups = randomiseOrder(testXMLSetups);
	}
	
	$(testXMLSetups).each(function(index,elem){
		testState.stateMap.push(elem);
	})
	 
	 testState.stateMap.push(postTest);
	 
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
        console.log('slider ' + id + ': '+ position + ' (' + time + ')'); // DEBUG/SAFETY: show position and slider id
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
        console.log('slider ' + id + ' played (' + time + ')'); // DEBUG/SAFETY: show played slider id
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
	projectReturn = xmlSetup[0].attributes['projectReturn'];
	if (projectReturn == undefined) {
		console.log("WARNING - projectReturn not specified! Will assume null.");
		projectReturn = "null";
	} else {
		projectReturn = projectReturn.value;
	}
	
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
            var time = audioEngineContext.timer.getTestTime();
            console.log('Stopped at ' + time); // DEBUG/SAFETY
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
	
	// Create the slider box to hold the slider elements
	var canvas = document.createElement('div');
	canvas.id = 'slider';
	canvas.align = "left";
	canvas.addEventListener('dragover',function(event){
		event.preventDefault();
		return false;
	},false);
	var sliderMargin = document.createAttribute('marginsize');
	sliderMargin.nodeValue = 42; // Set default margins to 42px either side
	// Must have a known EXACT width, as this is used later to determine the ratings
	var w = (Number(sliderMargin.nodeValue)+8)*2;
	canvas.style.width = width - w +"px";
	canvas.style.marginLeft = sliderMargin.nodeValue +'px';
	canvas.setAttributeNode(sliderMargin);
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
	
	currentState = 'preTest';
	
	// Inject into HTML
	testContent.appendChild(title); // Insert the title
	testContent.appendChild(pagetitle);
	testContent.appendChild(interfaceButtons);
	testContent.appendChild(sliderBox);
	testContent.appendChild(feedbackHolder);
	insertPoint.appendChild(testContent);

	// Load the full interface
	testState.initialise();
	testState.advanceState();
	
}

function loadTest(textXML)
{
	
	// Reset audioEngineContext.Metric globals for new test
	audioEngineContext.newTestPage();
	
	var id = textXML.id;
	
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
	var offset = Number(document.getElementById('slider').attributes['marginsize'].value);
	var scale = document.getElementById('sliderScaleHolder');
	scale.innerHTML = null;
	interfaceObj.find('scale').each(function(index,scaleObj){
		var value = document.createAttribute('value');
		var position = Number(scaleObj.attributes['position'].value)*0.01;
		value.nodeValue = position;
		var pixelPosition = (position*positionScale)+offset;
		var scaleDOM = document.createElement('span');
		scaleDOM.textContent = scaleObj.textContent;
		scale.appendChild(scaleDOM);
		scaleDOM.style.left = Math.floor((pixelPosition-($(scaleDOM).width()/2)))+'px';
		scaleDOM.setAttributeNode(value);
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
		audioEngineContext.selectedTrack = function(id) {
			for (var i=0; i<this.audioObjects.length; i++)
			{
				if (id == i) {
					this.audioObjects[i].loopStart();
				} else {
					this.audioObjects[i].loopStop();
				}
			}
		};
	} else {
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
		var w = window.innerWidth - (offset+8)*2;
		w = Math.random()*w;
		w = Math.floor(w+(offset+8));
		trackSliderObj.style.left = w+'px';
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
			// Start the test on first click, that way timings are more accurate.
			audioEngineContext.play();
			if (audioEngineContext.audioObjectsReady) {
				// Cannot continue to issue play command until audioObjects reported as ready!
				// Get the track ID from the object ID
				var id = Number(this.id.substr(13,2)); // Maximum theoretical tracks is 99!
				//audioEngineContext.metric.sliderPlayed(id);
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
			}
		};
		
		canvas.appendChild(trackSliderObj);
		audioEngineContext.audioObjects[index].metric.initialised(convSliderPosToRate(index));
        
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
	
	
	testWaitIndicator();
}


function dragEnd(ev) {
	// Function call when a div has been dropped
	var slider = document.getElementById('slider');
	var marginSize = Number(slider.attributes['marginsize'].value);
	var w = slider.style.width;
	w = Number(w.substr(0,w.length-2));
	var x = ev.x;
	if (x >= marginSize && x < w+marginSize) {
		this.style.left = (x)+'px';
	} else {
		if (x<marginSize) {
			this.style.left = marginSize+'px';
		} else {
			this.style.left = (w+marginSize) + 'px';
		}
	}
	audioEngineContext.metric.sliderMoved();
}

function buttonSubmitClick() // TODO: Only when all songs have been played!
{
    hasBeenPlayed = audioEngineContext.checkAllPlayed();
    if (hasBeenPlayed.length == 0) {
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
	    testState.advanceState();
    } else // if a fragment has not been played yet
    {
    	str = "";
    	if (hasBeenPlayed.length > 1) {
	    	for (var i=0; i<hasBeenPlayed.length; i++) {
	    		str = str + hasBeenPlayed[i];
	    		if (i < hasBeenPlayed.length-2){
	    			str += ", ";
	    		} else if (i == hasBeenPlayed.length-2) {
	    			str += " or ";
	    		}
	    	}
	    	alert('You have not played fragments ' + str + ' yet. Please listen, rate and comment all samples before submitting.');
       } else {
       		alert('You have not played fragment ' + hasBeenPlayed[0] + ' yet. Please listen, rate and comment all samples before submitting.');
       }
        return;
    }
}

function convSliderPosToRate(id)
{
	var w = document.getElementById('slider').style.width;
	var marginsize = Number(document.getElementById('slider').attributes['marginsize'].value);
	var maxPix = w.substr(0,w.length-2);
	var slider = document.getElementsByClassName('track-slider')[id];
	var pix = slider.style.left;
	pix = pix.substr(0,pix.length-2);
	var rate = (pix-marginsize)/maxPix;
	return rate;
}

function resizeWindow(event){
	// Function called when the window has been resized.
	// MANDATORY FUNCTION
	
	// Store the slider marker values
	var holdValues = [];
	$(".track-slider").each(function(index,sliderObj){
		holdValues.push(convSliderPosToRate(index));
	});
	
	var width = event.target.innerWidth;
	var canvas = document.getElementById('sliderCanvasHolder');
	var sliderDiv = canvas.children[0];
	var sliderScaleDiv = canvas.children[1];
	var marginsize = Number(sliderDiv.attributes['marginsize'].value);
	var w = (marginsize+8)*2;
	sliderDiv.style.width = width - w + 'px';
	var width = width - w;
	// Move sliders into new position
	$(".track-slider").each(function(index,sliderObj){
		var pos = holdValues[index];
		var pix = pos * width;
		sliderObj.style.left = pix+marginsize+'px';
	});
	
	// Move scale labels
	$(sliderScaleDiv.children).each(function(index,scaleObj){
		var position = Number(scaleObj.attributes['value'].value);
		var pixelPosition = (position*width)+marginsize;
		scaleObj.style.left = Math.floor((pixelPosition-($(scaleObj).width()/2)))+'px';
	});
}

function pageXMLSave(store, testXML, testId)
{
	// Saves a specific test page
	var xmlDoc = store;
	// Check if any session wide metrics are enabled
	
	var commentShow = testXML.attributes['elementComments'];
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
            console.log('Comment ' + i + ': ' + commentObjects[i].children[2].value); // DEBUG/SAFETY
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
        console.log('Question ' + i + ': ' + commentQuestion[i].children[2].value); // DEBUG/SAFETY
		cqHolder.appendChild(question);
		cqHolder.appendChild(comment);
		xmlDoc.appendChild(cqHolder);
	}
	store = xmlDoc;
}
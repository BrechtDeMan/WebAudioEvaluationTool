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
loadInterface();

function loadInterface() {
	
	// Get the dimensions of the screen available to the page
	var width = window.innerWidth;
	var height = window.innerHeight;
	
	// The injection point into the HTML page
	interfaceContext.insertPoint = document.getElementById("topLevelBody");
	var testContent = document.createElement('div');
	
	testContent.id = 'testContent';

	
	// Create APE specific metric functions
	audioEngineContext.metric.initialiseTest = function()
	{
	};
	
	audioEngineContext.metric.sliderMoved = function()
	{
		
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
	
	// Bindings for audioObjects
	
	// Create the top div for the Title element
	var titleAttr = specification.title;
	var title = document.createElement('div');
	title.className = "title";
	title.align = "center";
	var titleSpan = document.createElement('span');
	
	// Set title to that defined in XML, else set to default
	if (titleAttr != undefined) {
		titleSpan.textContent = titleAttr;
	} else {
		titleSpan.textContent =  'Listening test';
	}
	// Insert the titleSpan element into the title div element.
	title.appendChild(titleSpan);
	
	var pagetitle = document.createElement('div');
	pagetitle.className = "pageTitle";
	pagetitle.align = "center";
	var titleSpan = document.createElement('span');
	titleSpan.id = "pageTitle";
	pagetitle.appendChild(titleSpan);
	
	// Create Interface buttons!
	var interfaceButtons = document.createElement('div');
	interfaceButtons.id = 'interface-buttons';
	
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
	interfaceContext.insertPoint.innerHTML = null; // Clear the current schema
	
	// Inject into HTML
	testContent.appendChild(title); // Insert the title
	testContent.appendChild(pagetitle);
	testContent.appendChild(interfaceButtons);
	testContent.appendChild(sliderBox);
	testContent.appendChild(feedbackHolder);
	interfaceContext.insertPoint.appendChild(testContent);

	// Load the full interface
	testState.initialise();
	testState.advanceState();
	
}

function loadTest(audioHolderObject)
{
	
	// Reset audioEngineContext.Metric globals for new test
	audioEngineContext.newTestPage();
	
	var id = audioHolderObject.id;
	
	var feedbackHolder = document.getElementById('feedbackHolder');
	var canvas = document.getElementById('slider');
	feedbackHolder.innerHTML = null;
	canvas.innerHTML = null;
	
	var playbackHolder = document.createElement('div');
	playbackHolder.style.width = "100%";
	playbackHolder.align = 'center';
	playbackHolder.appendChild(interfaceContext.playhead.object);
	feedbackHolder.appendChild(playbackHolder);
	// Setup question title
	var interfaceObj = audioHolderObject.interfaces;
	var commentBoxPrefix = "Comment on track";
	if (interfaceObj.length != 0) {
		interfaceObj = interfaceObj[0];
		var titleNode = interfaceObj.title;
		if (titleNode != undefined)
		{
			document.getElementById('pageTitle').textContent = titleNode;
		}
		var positionScale = canvas.style.width.substr(0,canvas.style.width.length-2);
		var offset = Number(document.getElementById('slider').attributes['marginsize'].value);
		var scale = document.getElementById('sliderScaleHolder');
		scale.innerHTML = null;
		$(interfaceObj.scale).each(function(index,scaleObj){
			var value = document.createAttribute('value');
			var position = Number(scaleObj[0])*0.01;
			value.nodeValue = position;
			var pixelPosition = (position*positionScale)+offset;
			var scaleDOM = document.createElement('span');
			scaleDOM.textContent = scaleObj[1];
			scale.appendChild(scaleDOM);
			scaleDOM.style.left = Math.floor((pixelPosition-($(scaleDOM).width()/2)))+'px';
			scaleDOM.setAttributeNode(value);
		});
		
		if (interfaceObj.commentBoxPrefix != undefined) {
			commentBoxPrefix = interfaceObj.commentBoxPrefix;
		}
	}

	/// CHECK FOR SAMPLE RATE COMPATIBILITY
	if (audioHolderObject.sampleRate != undefined) {
		if (Number(audioHolderObject.sampleRate) != audioContext.sampleRate) {
			var errStr = 'Sample rates do not match! Requested '+Number(audioHolderObject.sampleRate)+', got '+audioContext.sampleRate+'. Please set the sample rate to match before completing this test.';
			alert(errStr);
			return;
		}
	}
	
	var commentShow = audioHolderObject.elementComments;
	
	var loopPlayback = audioHolderObject.loop;

	audioEngineContext.loopPlayback = loopPlayback;
	// Create AudioEngine bindings for playback
	audioEngineContext.selectedTrack = function(id) {
		console.log('Deprecated');
	};
	
	currentTestHolder = document.createElement('audioHolder');
	currentTestHolder.id = audioHolderObject.id;
	currentTestHolder.repeatCount = audioHolderObject.repeatCount;
	
	var randomise = audioHolderObject.randomiseOrder;
	
	var audioElements = audioHolderObject.audioElements;
	currentTrackOrder = [];
	if (randomise) {
		audioHolderObject.audioElements = randomiseOrder(audioHolderObject.audioElements);
	}
	
	// Delete any previous audioObjects associated with the audioEngine
	audioEngineContext.audioObjects = [];
	
	// Find all the audioElements from the audioHolder
	$(audioHolderObject.audioElements).each(function(index,element){
		// Find URL of track
		// In this jQuery loop, variable 'this' holds the current audioElement.
		
		// Now load each audio sample. First create the new track by passing the full URL
		var trackURL = audioHolderObject.hostURL + element.url;
		var audioObject = audioEngineContext.newTrack(element);
		
		if (commentShow) {
			var node = interfaceContext.createCommentBox(audioObject);
		}
		
		// Create a slider per track
		audioObject.interfaceDOM = new sliderObject(audioObject);
		
		// Distribute it randomnly
		var w = window.innerWidth - (offset+8)*2;
		w = Math.random()*w;
		w = Math.floor(w+(offset+8));
		audioObject.interfaceDOM.trackSliderObj.style.left = w+'px';
		
		canvas.appendChild(audioObject.interfaceDOM.trackSliderObj);
		audioObject.metric.initialised(convSliderPosToRate(audioObject.interfaceDOM.trackSliderObj));
        
	});
	if (commentShow) {
		interfaceContext.showCommentBoxes(feedbackHolder,true);
	}
	
	$(audioHolderObject.commentQuestions).each(function(index,element) {
		var node = interfaceContext.createCommentQuestion(element);
		feedbackHolder.appendChild(node.holder);
	});
	
	
	testWaitIndicator();
}

function sliderObject(audioObject) {
	// Create a new slider object;
	this.parent = audioObject;
	this.trackSliderObj = document.createElement('div');
	this.trackSliderObj.className = 'track-slider';
	this.trackSliderObj.id = 'track-slider-'+audioObject.id;

	this.trackSliderObj.setAttribute('trackIndex',audioObject.id);
	this.trackSliderObj.innerHTML = '<span>'+audioObject.id+'</span>';
	this.trackSliderObj.draggable = true;
	this.trackSliderObj.ondragend = dragEnd;

	// Onclick, switch playback to that track
	this.trackSliderObj.onclick = function() {
		// Start the test on first click, that way timings are more accurate.
		audioEngineContext.play();
		if (audioEngineContext.audioObjectsReady) {
			// Cannot continue to issue play command until audioObjects reported as ready!
			// Get the track ID from the object ID
			var id = Number(event.srcElement.attributes['trackIndex'].value);
			//audioEngineContext.metric.sliderPlayed(id);
			audioEngineContext.play(id);
            // Currently playing track red, rest green
            
            //document.getElementById('track-slider-'+index).style.backgroundColor = "#FF0000";
            $('.track-slider').removeClass('track-slider-playing');
            $(event.srcElement).addClass('track-slider-playing');
            $('.comment-div').removeClass('comment-box-playing');
            $('#comment-div-'+id).addClass('comment-box-playing');
		}
	};
	
	this.exportXMLDOM = function() {
		// Called by the audioObject holding this element. Must be present
		var node = document.createElement('value');
		node.textContent = convSliderPosToRate(this.trackSliderObj);
		return node;
	};
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
	var time = audioEngineContext.timer.getTestTime();
	var id = Number(ev.srcElement.getAttribute('trackindex'));
	audioEngineContext.audioObjects[id].metric.moved(time,convSliderPosToRate(ev.srcElement));
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

function convSliderPosToRate(slider)
{
	var w = document.getElementById('slider').style.width;
	var marginsize = Number(document.getElementById('slider').attributes['marginsize'].value);
	var maxPix = w.substr(0,w.length-2);
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

function pageXMLSave(store, testXML)
{
	// Saves a specific test page
	var xmlDoc = store;
	// Check if any session wide metrics are enabled
	
	var commentShow = testXML.elementComments;
	
	var metric = document.createElement('metric');
	if (audioEngineContext.metric.enableTestTimer)
	{
		var testTime = document.createElement('metricResult');
		testTime.id = 'testTime';
		testTime.textContent = audioEngineContext.timer.testDuration;
		metric.appendChild(testTime);
	}
	xmlDoc.appendChild(metric);
	var audioObjects = audioEngineContext.audioObjects;
	for (var i=0; i<audioObjects.length; i++) 
	{
		var audioElement = audioEngineContext.audioObjects[i].exportXMLDOM();
		xmlDoc.appendChild(audioElement);
	}
	
	$(interfaceContext.commentQuestions).each(function(index,element){
		var node = element.exportXMLDOM();
		xmlDoc.appendChild(node);
	});
	store = xmlDoc;
}
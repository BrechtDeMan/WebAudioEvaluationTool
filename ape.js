/**
 *  ape.js
 *  Create the APE interface
 */

// Once this is loaded and parsed, begin execution
loadInterface(projectXML);

function loadInterface(xmlDoc) {
	
	// Get the dimensions of the screen available to the page
	var width = window.innerWidth;
	var height = window.innerHeight;
	
	// Set background to grey #ddd
	document.getElementsByTagName('body')[0].style.backgroundColor = '#ddd';
	
	// The injection point into the HTML page
	var insertPoint = document.getElementById("topLevelBody");
	var testContent = document.createElement('div');
	testContent.id = 'testContent';
	
	
	// Decode parts of the xmlDoc that are needed
	// xmlDoc MUST already be parsed by jQuery!
	var xmlSetup = xmlDoc.find('setup');
	// Should put in an error function here incase of malprocessed or malformed XML
	
	// Create the top div for the Title element
	var titleAttr = xmlSetup[0].attributes['title'];
	var title = document.createElement('div');
	title.className = "title";
	title.align = "center";
	var titleSpan = document.createElement('span');
	
	// Set title to that defined in XML, else set to default
	if (titleAttr != undefined) {
		titleSpan.innerText = titleAttr.value;
	} else {
		titleSpan.innerText =  'APE Tool';
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
	playback.innerText = 'Start';
	// onclick function. Check if it is playing or not, call the correct function in the
	// audioEngine, change the button text to reflect the next state.
	playback.onclick = function() {
		if (audioEngineContext.status == 0) {
			audioEngineContext.play();
			this.innerText = 'Stop';
		} else {
			audioEngineContext.stop();
			this.innerText = 'Start';
		}
	};
	// Create Submit (save) button
	var submit = document.createElement("button");
	submit.innerText = 'Submit';
	submit.onclick = function() {
		// TODO: Update this for postTest tags
		createProjectSave(projectReturn)
	};
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
	canvas.style.height = 150 + "px";
	canvas.style.marginBottom = "25px";
	canvas.style.backgroundColor = '#eee';
	canvas.align = "left";
	sliderBox.appendChild(canvas);
	
	// Global parent for the comment boxes on the page
	var feedbackHolder = document.createElement('div');
	// Find the parent audioHolder object.
	var audioHolder = xmlDoc.find('audioHolder');
	audioHolder = audioHolder[0]; // Remove from one field array
	// Extract the hostURL attribute. If not set, create an empty string.
	var hostURL = audioHolder.attributes['hostURL'];
	if (hostURL == undefined) {
		hostURL = "";
	} else {
		hostURL = hostURL.value;
	}
	// Extract the sampleRate. If set, convert the string to a Number.
	var hostFs = audioHolder.attributes['sampleRate'];
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
	var audioElements = $(audioHolder).find('audioElements');
	audioElements.each(function(index,element){
		// Find URL of track
		// In this jQuery loop, variable 'this' holds the current audioElement.
		
		// Now load each audio sample. First create the new track by passing the full URL
		var trackURL = hostURL + this.attributes['url'].value;
		audioEngineContext.newTrack(trackURL);
		// Create document objects to hold the comment boxes
		var trackComment = document.createElement('div');
		// Create a string next to each comment asking for a comment
		var trackString = document.createElement('span');
		trackString.innerText = 'Comment on track '+index;
		// Create the HTML5 comment box 'textarea'
		var trackCommentBox = document.createElement('textarea');
		trackCommentBox.rows = '4';
		trackCommentBox.cols = '100';
		trackCommentBox.name = 'trackComment'+index;
		trackCommentBox.className = 'trackComment';
		// Add to the holder.
		trackComment.appendChild(trackString);
		trackComment.appendChild(trackCommentBox);
		feedbackHolder.appendChild(trackComment);
		
		// Create a slider per track
		
		var trackSliderObj = document.createElement('div');
		trackSliderObj.className = 'track-slider';
		trackSliderObj.id = 'track-slider-'+index;
		trackSliderObj.style.position = 'absolute';
		// Distribute it randomnly
		var w = window.innerWidth - 100;
		w = Math.random()*w;
		trackSliderObj.style.left = Math.floor(w)+50+'px';
		trackSliderObj.style.height = "150px";
		trackSliderObj.style.width = "10px";
		trackSliderObj.style.backgroundColor = 'rgb(100,200,100)';
		trackSliderObj.innerHTML = '<span>'+index+'</span>';
		trackSliderObj.style.float = "left";
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
	
	
	// Create pre and post test questions
	
	// Inject into HTML
	insertPoint.innerHTML = null; // Clear the current schema
	testContent.appendChild(title); // Insert the title
	testContent.appendChild(interfaceButtons);
	testContent.appendChild(sliderBox);
	testContent.appendChild(feedbackHolder);
	insertPoint.appendChild(testContent);
	
	var preTest = xmlDoc.find('PreTest');
	var postTest = xmlDoc.find('PostTest');
	preTest = preTest[0];
	postTest = postTest[0];
	if (preTest != undefined || postTest != undefined)
	{
		testContent.style.zIndex = 1;
		var blank = document.createElement('div');
		blank.id = 'testHalt';
		blank.style.zIndex = 2;
		blank.style.width = window.innerWidth + 'px';
		blank.style.height = window.innerHeight + 'px';
		blank.style.position = 'absolute';
		blank.style.top = '0';
		blank.style.left = '0';
		insertPoint.appendChild(blank);
	}
	
	// Create Pre-Test Box
	if (preTest != undefined && preTest.children.length >= 1)
	{
		
		var preTestHolder = document.createElement('div');
		preTestHolder.id = 'preTestHolder';
		preTestHolder.style.zIndex = 2;
		preTestHolder.style.width = '500px';
		preTestHolder.style.height = '250px';
		preTestHolder.style.backgroundColor = '#fff';
		preTestHolder.style.position = 'absolute';
		preTestHolder.style.left = (window.innerWidth/2)-250 + 'px';
		preTestHolder.style.top = (window.innerHeight/2)-125 + 'px';
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
		nextButton.id = 'preTestNext';
		nextButton.value = '1';
		nextButton.innerHTML = 'next';
		nextButton.style.position = 'relative';
		nextButton.style.left = '450px';
		nextButton.style.top = '175px';
		nextButton.onclick = function() {
			// Need to find and parse preTest again!
			var preTest = projectXML.find('PreTest')[0];
			// Check if current state is a question!
			if (preTest.children[this.value-1].nodeName == 'question') {
				var questionId = preTest.children[this.value-1].attributes['id'].value;
				var questionHold = document.createElement('comment');
				var questionResponse = document.getElementById(questionId + 'response');
				questionHold.id = questionId;
				questionHold.innerHTML = questionResponse.value;
				preTestQuestions.appendChild(questionHold);
			}
			if (this.value < preTest.children.length)
			{
				// More to process
				var child = preTest.children[this.value];
				if (child.nodeName == 'statement')
				{
					preTestOption.innerHTML = '<span>'+child.innerHTML+'</span>';
				} else if (child.nodeName == 'question')
				{
					var textHold = document.createElement('span');
					textHold.innerHTML = child.innerHTML;
					var textEnter = document.createElement('textarea');
					textEnter.id = child.attributes['id'].value + 'response';
					preTestOption.innerHTML = null;
					preTestOption.appendChild(textHold);
					preTestOption.appendChild(textEnter);
				}
			} else {
				// Time to clear
				preTestHolder.style.zIndex = -1;
				preTestHolder.style.visibility = 'hidden';
				var blank = document.getElementById('testHalt');
				blank.style.zIndex = -2;
				blank.style.visibility = 'hidden';
			}
			this.value++;
		};
		
		preTestHolder.appendChild(preTestOption);
		preTestHolder.appendChild(nextButton);
		insertPoint.appendChild(preTestHolder);
	}

}

function dragEnd(ev) {
	// Function call when a div has been dropped
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
		var trackObj = document.createElement("Track");
		trackObj.id = i;
		var slider = document.createElement("Rating");
		var rate = Number(trackSliderObjects[i].style.left.substr(0,trackSliderObjects[i].style.left.length-2));
		rate = (rate-rateMin)/rateMax;
		slider.innerText = Math.floor(rate*100);
		var comment = document.createElement("Comment");
		comment.innerText = commentObjects[i].value;
		trackObj.appendChild(slider);
		trackObj.appendChild(comment);
		xmlDoc.appendChild(trackObj);
	}
	
	// Append Pre/Post Questions
	xmlDoc.appendChild(preTestQuestions);
	xmlDoc.appendChild(postTestQuestions);
	
	return xmlDoc;
}


/**
 *  ape.js
 *  Create the APE interface
 */

// Once this is loaded and parsed, begin execution
loadInterface(projectXML);

function loadInterface(xmlDoc) {
	
	var width = window.innerWidth;
	var height = window.innerHeight;
	
	// Set background to grey #ddd
	document.getElementsByTagName('body')[0].style.backgroundColor = '#ddd';
	
	// The injection point into the HTML page
	var insertPoint = document.getElementById("topLevelBody");
	
	
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
	playback.onclick = function() {
		if (audioEngineContext.status == 0) {
			audioEngineContext.play();
			this.innerText = 'Stop';
		} else {
			audioEngineContext.stop();
			this.innerText = 'Start';
		}
	}
	// Create Submit (save) button
	var submit = document.createElement("button");
	submit.innerText = 'Submit';
	submit.onclick = function() {
		// TODO: Update this for postTest tags
		createProjectSave(projectReturn)
	}
	
	interfaceButtons.appendChild(playback);
	interfaceButtons.appendChild(submit);
	interfaceButtons.appendChild(downloadPoint);
	
	// Now create the slider and HTML5 canvas boxes
	
	var sliderBox = document.createElement('div');
	sliderBox.className = 'sliderCanvasDiv';
	sliderBox.id = 'sliderCanvasHolder'; // create an id so we can easily link to it later
	sliderBox.align = 'center';
	
	var canvas = document.createElement('div');
	canvas.id = 'slider';
	canvas.style.width = width - 100 +"px";
	canvas.style.height = 150 + "px";
	canvas.style.marginBottom = "25px"
	canvas.style.backgroundColor = '#eee';
	canvas.align = "left";
	sliderBox.appendChild(canvas);

	var feedbackHolder = document.createElement('div');
	
	var tracks = xmlDoc.find('audioHolder');
	tracks = tracks[0];
	var hostURL = tracks.attributes['hostURL'];
	if (hostURL == undefined) {
		hostURL = "";
	} else {
		hostURL = hostURL.value;
	}
	
	var hostFs = tracks.attributes['sampleRate'];
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
	
	var tracksXML = xmlDoc.find('audioElements');
	tracksXML.each(function(index,element){
		// Find URL of track
		var trackURL = hostURL + this.attributes['url'].value;
		// Now load each track in
		audioEngineContext.newTrack(trackURL);
		var trackObj = document.createElement('div');
		var trackTitle = document.createElement('span');
		trackTitle.innerText = 'Comment on track '+index;
		var trackComment = document.createElement('textarea');
		trackComment.rows = '4';
		trackComment.cols = '100';
		trackComment.name = 'trackComment'+index;
		trackComment.className = 'trackComment';
		trackObj.appendChild(trackTitle);
		trackObj.appendChild(trackComment);
		feedbackHolder.appendChild(trackObj);
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
	
	
	// Inject into HTML
	insertPoint.innerHTML = null; // Clear the current schema
	insertPoint.appendChild(title); // Insert the title
	insertPoint.appendChild(interfaceButtons);
	insertPoint.appendChild(sliderBox);
	insertPoint.appendChild(feedbackHolder);
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
	
	return xmlDoc;
}


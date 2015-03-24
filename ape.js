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
	
	var tracksXML = xmlDoc.find('track');
	tracksXML.each(function(index,element){
		var trackObj = document.createElement('div');
		var trackTitle = document.createElement('span');
		trackTitle.innerText = 'Comment on track '+index;
		var trackComment = document.createElement('textarea');
		trackComment.rows = '4';
		trackComment.cols = '100';
		trackComment.name = 'trackComment'+index;
		trackComment.className = 'trackComment';
		feedbackHolder.appendChild(trackTitle);
		feedbackHolder.appendChild(trackComment);
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
		canvas.appendChild(trackSliderObj);
	})
	
	
	// Inject into HTML
	insertPoint.innerHTML = null; // Clear the current schema
	insertPoint.appendChild(title); // Insert the title
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

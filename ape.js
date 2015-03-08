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
	
	var canvas = document.createElement('canvas');
	canvas.id = 'slider';
	canvas.width = width - 100;
	canvas.height = 150;
	canvas.style.backgroundColor = '#eee';
	
	sliderBox.appendChild(canvas);
	
	
	// Inject into HTML
	insertPoint.innerHTML = null; // Clear the current schema
	insertPoint.appendChild(title); // Insert the title
	insertPoint.appendChild(sliderBox);
}

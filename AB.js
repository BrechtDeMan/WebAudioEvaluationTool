// Once this is loaded and parsed, begin execution
loadInterface();

function loadInterface() {
	// Get the dimensions of the screen available to the page
	var width = window.innerWidth;
	var height = window.innerHeight;
	interfaceContext.insertPoint.innerHTML = null; // Clear the current schema
	
	// Custom Comparitor Object
	Interface.prototype.comparitor = null;
	
	// The injection point into the HTML page
	interfaceContext.insertPoint = document.getElementById("topLevelBody");
	var testContent = document.createElement('div');
	testContent.id = 'testContent';
	
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
	interfaceButtons.style.height = '25px';
	
	// Create playback start/stop points
	var playback = document.createElement("button");
	playback.innerHTML = 'Stop';
	playback.id = 'playback-button';
	playback.style.float = 'left';
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
	// Append the interface buttons into the interfaceButtons object.
	interfaceButtons.appendChild(playback);
	
	// Global parent for the comment boxes on the page
	var feedbackHolder = document.createElement('div');
	feedbackHolder.id = 'feedbackHolder';
	
	// Construct the AB Boxes
	var boxes = document.createElement('div');
	boxes.align = "center";
	var boxA = document.createElement('div');
	boxA.className = 'comparitor-holder';
	boxA.id = 'comparitor-A';
	var selector = document.createElement('div');
	selector.className = 'comparitor-selector';
	selector.innerHTML = '<span>A</span>';
	var playback = document.createElement('button');
	playback.className = 'comparitor-button';
	playback.textContent = "Listen";
	boxA.appendChild(selector);
	boxA.appendChild(playback); 
	boxes.appendChild(boxA);
	
	var boxB = document.createElement('div');
	boxB.className = 'comparitor-holder';
	boxB.id = 'comparitor-B';
	var selector = document.createElement('div');
	selector.className = 'comparitor-selector';
	selector.innerHTML = '<span>B</span>';
	var playback = document.createElement('button');
	playback.className = 'comparitor-button';
	playback.textContent = "Listen";
	boxB.appendChild(selector);
	boxB.appendChild(playback); 
	boxes.appendChild(boxB);
	
	var submit = document.createElement('button');
	submit.id = "submit";
	submit.onclick = function() {interfaceContext.comparitor.submitButton();};
	submit.className = "big-button";
	submit.textContent = "submit";
	submit.style.position = "absolute";
	submit.style.top = '466px';
		
	feedbackHolder.appendChild(boxes);
	feedbackHolder.appendChild(submit);
	
	// Inject into HTML
	testContent.appendChild(title); // Insert the title
	testContent.appendChild(pagetitle);
	testContent.appendChild(interfaceButtons);
	testContent.appendChild(feedbackHolder);
	interfaceContext.insertPoint.appendChild(testContent);

	// Load the full interface
	testState.initialise();
	testState.advanceState();
	resizeWindow(null);
}

function loadTest(audioHolderObject)
{
	var feedbackHolder = document.getElementById('feedbackHolder');
	var interfaceObj = audioHolderObject.interfaces;
	if (interfaceObj.length > 1)
	{
		console.log("WARNING - This interface only supports one <interface> node per page. Using first interface node");
	}
	interfaceObj = interfaceObj[0];
	
	if(interfaceObj.title != null)
	{
		document.getElementById("pageTitle").textContent = interfaceObj.title;
	}
	
	// Populate the comparitor object
	interfaceContext.comparitor = new Comparitor(audioHolderObject);
	interfaceContext.comparitor.progress();
}

function Comparitor(audioHolderObject)
{
	this.pairs = [];
	this.listened = [false, false];
	this.selected = null;
	this.index = -1;
	this.currentPair = null;
	this.progress = function()
	{
		this.index++;
		if (this.index >= this.pairs.length)
		{
			buttonSubmitClick();
			return;
		}
		$(".comparitor-selector").removeClass('selected');
		this.listened = [false, false];
		this.selected = null;
		this.currentPair = this.pairs[this.index];
	};
	
	// First generate the Audio Objects for the Audio Engine
	$(audioHolderObject.audioElements).each(function(index,element){
		if (index == audioHolderObject.outsideReference || element.type == 'outside-reference')
		{
			console.log("WARNING - AB cannot have fixed reference");
		}
		var audioObject = audioEngineContext.newTrack(element);
		audioObject.interfaceDOM = new comparitorElementObject(audioObject);
	});
	
	// Now generate the pairings
	this.pairs = [];
	var num_elems = audioEngineContext.audioObjects.length;
	for (var i=0; i<num_elems; i++)
	{
		for (var j=i+1; j<num_elems; j++)
		{
			var pair = {
				A: audioEngineContext.audioObjects[i],
				B: audioEngineContext.audioObjects[j]
			};
			this.pairs.push(pair);
		}
	}
	
	// Generate Interface Bindings
	$('.comparitor-selector').click(function(){
		$(".comparitor-selector").removeClass('selected');
		if (interfaceContext.comparitor.currentPair != null)
		{
			var side = this.parentElement.id.split('-')[1];
			var pair = interfaceContext.comparitor.currentPair;
			var selected = eval('interfaceContext.comparitor.currentPair.'+side);
			interfaceContext.comparitor.selected = selected;
			$(this).addClass('selected');
		}
	});
	
	$('.comparitor-button').click(function(){
		$('.comparitor-button').text('Listen');
		if (interfaceContext.comparitor.currentPair != null)
		{
			var side = this.parentElement.id.split('-')[1];
			var pair = interfaceContext.comparitor.currentPair;
			var selected = eval('interfaceContext.comparitor.currentPair.'+side);
			audioEngineContext.play(selected.id);
			$(this).text('Playing');
			if (side == 'A') {interfaceContext.comparitor.listened[0] = true;}
			else if (side == 'B') {interfaceContext.comparitor.listened[1] = true;}
		}
	});
	
	this.submitButton = function()
	{
		audioEngineContext.stop();
		$('.comparitor-button').text('Listen');
		// Check both A and B have been listened to
		if (this.listened[0] == false || this.listened[1] == false)
		{
			console.log("Listen to both A and B before submitting");
			alert("Listen to both A and B before submitting");
			return;
		}
		if (this.selected == null)
		{
			console.log("Select either A or B before submitting");
			alert("Select either A or B before submitting");
			return;
		}
		this.pairs[this.index].A.interfaceDOM.results.push({
			compair: this.pairs[this.index].B.specification.id,
			choice: this.selected
		});
		this.pairs[this.index].B.interfaceDOM.results.push({
			compair: this.pairs[this.index].A.specification.id,
			choice: this.selected
		});
		this.progress();
	};
	return this;
}

function comparitorElementObject(audioObject)
{
	// The Interface Object for the comparitor
	this.parent = audioObject;
	this.results = [];
	this.state = 0;
	this.enable = function()
	{
		this.state = 1;
	};
	this.exportXMLDOM = function(audioObject) {
		var obj = [];
		for (var result of this.results)
		{
			var node = storage.document.createElement('value');
			node.setAttribute('comparitorId',result.compair);
			node.setAttribute('selectedId',result.choice.specification.id);
			node.textContent = result.choice.specification.id;
			obj.push(node);
		}
		return obj;
	};
	this.getValue = function() {
		return 0;
	};
}

function resizeWindow(event)
{
	var totalWidth = 620;
	var diff = (window.innerWidth - totalWidth)/2;
	document.getElementById('comparitor-A').style.left = diff +'px';
	document.getElementById('comparitor-B').style.left = diff +360 +'px';
	document.getElementById('submit').style.left = (window.innerWidth-250)/2 + 'px';
}

function buttonSubmitClick()
{
	var checks = [];
	checks = checks.concat(testState.currentStateMap.interfaces[0].options);
	checks = checks.concat(specification.interfaces.options);
	
	for (var i=0; i<checks.length; i++) {
		if (checks[i].type == 'check')
		{
			switch(checks[i].name) {
			default:
				console.log("WARNING - Check option "+checks[i].check+" is not supported on this interface");
				break;
			}

		}
	}
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
}

function pageXMLSave(store, pageSpecification)
{
	// MANDATORY
	// Saves a specific test page
	// You can use this space to add any extra nodes to your XML <audioHolder> saves
	// Get the current <page> information in store (remember to appendChild your data to it)
	// pageSpecification is the current page node configuration
	// To create new XML nodes, use storage.document.createElement();
}
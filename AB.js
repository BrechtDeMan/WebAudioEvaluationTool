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
	boxes.id = "box-holders";
	
	var submit = document.createElement('button');
	submit.id = "submit";
	submit.onclick = buttonSubmitClick;
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
	resizeWindow(null);
}

function Comparitor(audioHolderObject)
{	
	this.comparitorBox = function(audioElement,id,text)
	{
		this.parent = audioElement;
		this.id = id;
		this.value = 0;
		this.disabled = true;
		this.box = document.createElement('div');
		this.box.className = 'comparitor-holder';
		this.box.setAttribute('track-id',audioElement.id);
		this.box.id = 'comparitor-'+text;
		this.selector = document.createElement('div');
		this.selector.className = 'comparitor-selector disabled';
		var selectorText = document.createElement('span');
		selectorText.textContent = text;
		this.selector.appendChild(selectorText);
		this.playback = document.createElement('button');
		this.playback.className = 'comparitor-button';
		this.playback.disabled = true;
		this.playback.textContent = "Listen";
		this.box.appendChild(this.selector);
		this.box.appendChild(this.playback);
		this.selector.onclick = function()
		{
			if ($(event.currentTarget).hasClass('disabled'))
			{
				console.log("Please wait until sample has loaded");
				return;
			}
			$(".comparitor-selector").removeClass('selected');
			var id = event.currentTarget.parentElement.getAttribute('track-id');
			interfaceContext.comparitor.selected = id;
			$(event.currentTarget).addClass('selected');
			for (var i=0; i<interfaceContext.comparitor.comparitors.length; i++)
			{
				var obj = interfaceContext.comparitor.comparitors[i];
				if (i == id) {
					obj.value = 1;
				} else {
					obj.value = 0;
				}
				obj.parent.metric.moved(audioEngineContext.timer.getTestTime(),obj.value);
			}
		};
		this.playback.onclick = function()
		{
			$('.comparitor-button').text('Listen');
			var id = event.currentTarget.parentElement.getAttribute('track-id');
			audioEngineContext.play(id);
			$(event.currentTarget).text('Playing');
		};
		
		this.enable = function()
		{
			if (this.parent.state == 1)
			{
				$(this.selector).removeClass('disabled');
				this.playback.disabled = false;
			}
		};
		this.updateLoading = function(progress)
		{
			if (progress != 100)
			{
				progress = String(progress);
				progress = progress.split('.')[0];
				this.playback.textContent = progress+'%';
			} else {
				this.playback.textContent = "Listen";
			}
		};
		this.exportXMLDOM = function(audioObject)
		{
			var node = storage.document.createElement('value');
			node.textContent = this.value;
			return node;
		};
		this.getValue = function() {
			return this.value;	
		};
	};
	
	this.boxHolders = document.getElementById('box-holders');
	this.boxHolders.innerHTML = null;
	this.comparitors = [];
	this.selected = null;
	
	// First generate the Audio Objects for the Audio Engine
	for (var index=0; index<audioHolderObject.audioElements.length; index++)
	{
		var element = audioHolderObject.audioElements[index];
		if (index == audioHolderObject.outsideReference || element.type == 'outside-reference')
		{
			console.log("WARNING - AB cannot have fixed reference");
		}
		var audioObject = audioEngineContext.newTrack(element);
		var node = new this.comparitorBox(audioObject,index,String.fromCharCode(65 + index));
		audioObject.bindInterface(node);
		this.comparitors.push(node);
		this.boxHolders.appendChild(node.box);
	}
	return this;
}

function resizeWindow(event)
{
	document.getElementById('submit').style.left = (window.innerWidth-250)/2 + 'px';
	var numObj = interfaceContext.comparitor.comparitors.length;
	var boxW = numObj*260;
	var spaces = numObj-1;
	var spaceSize = 50;
	var remainder = window.innerWidth - boxW;
	if (remainder < spaces*spaceSize)
	{
		spaceSize = Math.floor(spaces/remainder);
	}
	var totalW = boxW + spaces*spaceSize;
	var diff = (window.innerWidth - totalW)/2;
	for (var i=0; i<interfaceContext.comparitor.comparitors.length; i++)
	{
		var obj = interfaceContext.comparitor.comparitors[i];
		obj.box.style.left = diff + (260+spaceSize)*i + 'px';
	}
}

function buttonSubmitClick()
{
	var checks = [];
	checks = checks.concat(testState.currentStateMap.interfaces[0].options);
	checks = checks.concat(specification.interfaces.options);
	var canContinue = true;
	
	for (var i=0; i<checks.length; i++) {
		if (checks[i].type == 'check')
		{
			switch(checks[i].name) {
			case 'fragmentPlayed':
				// Check if all fragments have been played
				var checkState = interfaceContext.checkAllPlayed();
				if (checkState == false) {canContinue = false;}
				break;
			case  'fragmentFullPlayback':
				// Check all fragments have been played to their full length
				var checkState = interfaceContext.checkFragmentsFullyPlayed();
				if (checkState == false) {canContinue = false;}
				break;
			case 'fragmentMoved':
				// Check all fragment sliders have been moved.
				var checkState = interfaceContext.checkAllMoved();
				if (checkState == false) {canContinue = false;}
				break;
			case 'fragmentComments':
				// Check all fragment sliders have been moved.
				var checkState = interfaceContext.checkAllCommented();
				if (checkState == false) {canContinue = false;}
				break;
			default:
				console.log("WARNING - Check option "+checks[i].check+" is not supported on this interface");
				break;
			}

		}
		if (!canContinue) {break;}
	}
	if (canContinue)
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
	    testState.advanceState();
	}
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
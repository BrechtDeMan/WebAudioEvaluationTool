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
}

function Comparitor(audioHolderObject)
{
	this.pairs = [];
	this.listened = [false, false];
	this.selected = null;
	this.index = 0;
	this.feedbackHolder = document.getElementById('feedbackHolder');
	this.injectA = document.createElement('div');
	this.injectA.id = 'inject-A';
	this.injectB = document.createElement('div');
	this.injectB.id = 'inject-B';
	this.submitButton = document.createElement('button');
	this.progress = function()
	{
		if (this.index >= this.pairs.length)
		{
			buttonSubmitClick();
			return;
		}
		this.listened = [false, false];
		this.selected = null;
		var pair = this.pairs[this.index];
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
	this.feedbackHolder.innerHTML = null;
	this.feedbackHolder.appendChild(this.injectA);
	this.feedbackHolder.appendChild(this.injectB);
	this.feedbackHolder.appendChild(this.submitButton);
	
	this.submitButton.id = 'submit';
	this.submitButton.onclick = function()
	{
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
		this.pairs[this.index].A
	};
	return this;
}

function comparitorElementObject(audioObject)
{
	// The Interface Object for the comparitor
	this.parent = audioObject;
	this.holder = document.createElement('div');
	this.play = document.createElement('button');
	this.select = document.createElement('div');
	
	this.holder.className = "comparitor-holder";
	this.holder.appendChild(this.select);
	this.holder.appendChild(this.play);
	this.holder.align = "center";
	this.holder.setAttribute('trackIndex',audioObject.id);
	
	this.play.className = "comparitor-button";
	this.play.textContent = "Listen";
	
	this.select.className = "comparitor-selector";
}

function resizeWindow(event)
{
	
}

function buttonSubmitClick() // TODO: Only when all songs have been played!
{
	var checks = [];
	checks = checks.concat(testState.currentStateMap.interfaces[0].options);
	checks = checks.concat(specification.interfaces.options);
	var canContinue = true;
	
	// Check that the anchor and reference objects are correctly placed
	if (interfaceContext.checkHiddenAnchor() == false) {return;}
	if (interfaceContext.checkHiddenReference() == false) {return;}
	
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
				var checkState = interfaceContext.checkAllPlayed();
				if (checkState == false) {canContinue = false;}
				console.log('NOTE: fragmentFullPlayback not currently implemented, performing check fragmentPlayed instead');
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
			//case 'scalerange':
				// Check the scale is used to its full width outlined by the node
				//var checkState = interfaceContext.checkScaleRange();
				//if (checkState == false) {canContinue = false;}
			//	break;
			default:
				console.log("WARNING - Check option "+checks[i].check+" is not supported on this interface");
				break;
			}

		}
		if (!canContinue) {break;}
	}
	
    if (canContinue) {
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

function pageXMLSave(store, testXML)
{
	// MANDATORY
	// Saves a specific test page
	// You can use this space to add any extra nodes to your XML saves
}
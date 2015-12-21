/**
 *  mushra.js
 *  Create the MUSHRA interface
 */

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
	// Create Submit (save) button
	var submit = document.createElement("button");
	submit.innerHTML = 'Submit';
	submit.onclick = buttonSubmitClick;
	submit.id = 'submit-button';
	submit.style.float = 'left';
	// Append the interface buttons into the interfaceButtons object.
	interfaceButtons.appendChild(playback);
	interfaceButtons.appendChild(submit);
	
	// Create a slider box
	var sliderBox = document.createElement('div');
	sliderBox.style.width = "100%";
	sliderBox.style.height = window.innerHeight - 200+12 + 'px';
	sliderBox.style.marginBottom = '10px';
	sliderBox.id = 'slider';
	var scaleHolder = document.createElement('div');
	scaleHolder.id = "scale-holder";
	sliderBox.appendChild(scaleHolder);
	var sliderObjectHolder = document.createElement('div');
	sliderObjectHolder.id = 'slider-holder';
	sliderObjectHolder.align = "center";
	sliderBox.appendChild(sliderObjectHolder);
	
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
	var id = audioHolderObject.id;
	
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
	
	// Delete outside reference
	var outsideReferenceHolder = document.getElementById('outside-reference');
	if (outsideReferenceHolder != null) {
		document.getElementById('interface-buttons').removeChild(outsideReferenceHolder);
	}
	
	var sliderBox = document.getElementById('slider-holder');
	feedbackHolder.innerHTML = null;
	sliderBox.innerHTML = null;
	
	var commentBoxPrefix = "Comment on track";
	if (interfaceObj.commentBoxPrefix != undefined) {
		commentBoxPrefix = interfaceObj.commentBoxPrefix;
	}
	var loopPlayback = audioHolderObject.loop;
	
	currentTestHolder = document.createElement('audioHolder');
	currentTestHolder.id = audioHolderObject.id;
	currentTestHolder.repeatCount = audioHolderObject.repeatCount;
	
	$(audioHolderObject.commentQuestions).each(function(index,element) {
		var node = interfaceContext.createCommentQuestion(element);
		feedbackHolder.appendChild(node.holder);
	});
	
	// Find all the audioElements from the audioHolder
	$(audioHolderObject.audioElements).each(function(index,element){
		// Find URL of track
		// In this jQuery loop, variable 'this' holds the current audioElement.
		
		// Check if an outside reference
		if (index == audioHolderObject.outsideReference)
		{
			return;
		}
		
		var audioObject = audioEngineContext.newTrack(element);
		
		var node = interfaceContext.createCommentBox(audioObject);
		
		// Create a slider per track
		audioObject.interfaceDOM = new sliderObject(audioObject);
		
		if (typeof audioHolderObject.initialPosition === "number")
		{
			// Set the values
			audioObject.interfaceDOM.slider.value = audioHolderObject.initalPosition;
		} else {
			// Distribute it randomnly
			audioObject.interfaceDOM.slider.value = Math.random();
		}
		
		sliderBox.appendChild(audioObject.interfaceDOM.holder);
		audioObject.metric.initialised(audioObject.interfaceDOM.slider.value);
        
	});
	
	// Auto-align
	var numObj = audioHolderObject.audioElements.length;
	var totalWidth = (numObj-1)*150+100;
	var diff = (window.innerWidth - totalWidth)/2;
	sliderBox.style.marginLeft = diff + 'px';
	
	// Construct outside reference;
	if (audioHolderObject.outsideReference != null) {
		var outsideReferenceHolder = document.createElement('div');
		outsideReferenceHolder.id = 'outside-reference';
		outsideReferenceHolder.className = 'outside-reference';
		outsideReferenceHolderspan = document.createElement('span');
		outsideReferenceHolderspan.textContent = 'Reference';
		outsideReferenceHolder.appendChild(outsideReferenceHolderspan);
		
		var audioObject = audioEngineContext.newTrack(audioHolderObject.audioElements[audioHolderObject.outsideReference]);
		
		outsideReferenceHolder.onclick = function(event)
		{
			audioEngineContext.play(audioEngineContext.audioObjects.length-1);
			$('.track-slider').removeClass('track-slider-playing');
            $('.comment-div').removeClass('comment-box-playing');
            if (event.currentTarget.nodeName == 'DIV') {
            	$(event.currentTarget).addClass('track-slider-playing');
            } else {
            	$(event.currentTarget.parentElement).addClass('track-slider-playing');
            }
		};
		
		document.getElementById('interface-buttons').appendChild(outsideReferenceHolder);
	}
}

function sliderObject(audioObject)
{
	// Constructs the slider object. We use the HTML5 slider object
	this.parent = audioObject;
	this.holder = document.createElement('div');
	this.title = document.createElement('span');
	this.slider = document.createElement('input');
	this.play = document.createElement('button');
	
	this.holder.className = 'track-slider';
	this.holder.style.height = window.innerHeight-200 + 'px';
	this.holder.appendChild(this.title);
	this.holder.appendChild(this.slider);
	this.holder.appendChild(this.play);
	this.holder.align = "center";
	if (audioObject.id == 0)
	{
		this.holder.style.marginLeft = '0px';
	}
	this.holder.setAttribute('trackIndex',audioObject.id);
	
	this.title.textContent = audioObject.id;
	this.title.style.width = "100%";
	this.title.style.float = "left";
	
	this.slider.type = "range";
	this.slider.className = "track-slider-range track-slider-not-moved";
	this.slider.min = "0";
	this.slider.max = "1";
	this.slider.step = "0.01";
	this.slider.setAttribute('orient','vertical');
	this.slider.style.height = window.innerHeight-250 + 'px';
	this.slider.onchange = function()
	{
		var time = audioEngineContext.timer.getTestTime();
		var id = Number(this.parentNode.getAttribute('trackIndex'));
		audioEngineContext.audioObjects[id].metric.moved(time,this.value);
		console.log('slider '+id+' moved to '+this.value+' ('+time+')');
		$(this).removeClass('track-slider-not-moved');
	};
	
	this.play.textContent = "Loading...";
	this.play.value = audioObject.id;
	this.play.style.float = "left";
	this.play.style.width = "100%";
	this.play.disabled = true;
	this.play.onclick = function(event)
	{
		var id = Number(event.currentTarget.value);
		//audioEngineContext.metric.sliderPlayed(id);
		audioEngineContext.play(id);
		$(".track-slider").removeClass('track-slider-playing');
		$(event.currentTarget.parentElement).addClass('track-slider-playing');
		var outsideReference = document.getElementById('outside-reference');
		if (outsideReference != null) {
			$(outsideReference).removeClass('track-slider-playing');
		}
	};
	
	this.enable = function() {
		this.play.disabled = false;
		this.play.textContent = "Play";
		$(this.slider).removeClass('track-slider-disabled');
	};
	
	this.exportXMLDOM = function(audioObject) {
		// Called by the audioObject holding this element. Must be present
		var node = document.createElement('value');
		node.textContent = this.slider.value;
		return node;
	};
	this.getValue = function() {
		return this.slider.value;
	};
	
	this.resize = function(event)
	{
		this.holder.style.height = window.innerHeight-200 + 'px';
		this.slider.style.height = window.innerHeight-250 + 'px';
	};
	this.updateLoading = function(progress)
	{
		progress = String(progress);
		progress = progress.substr(0,5);
		this.play.textContent = "Loading: "+progress+"%";
	};
	
	if (this.parent.state == 1)
	{
		this.enable();
	}
}

function resizeWindow(event)
{
	// Function called when the window has been resized.
	// MANDATORY FUNCTION
	
	// Auto-align
	var numObj = audioEngineContext.audioObjects.length;
	var totalWidth = (numObj-1)*150+100;
	var diff = (window.innerWidth - totalWidth)/2;
	document.getElementById('slider').style.height = window.innerHeight - 180 + 'px';
	if (diff <= 0){diff = 0;}
	document.getElementById('slider-holder').style.marginLeft = diff + 'px';
	for (var i in audioEngineContext.audioObjects)
	{
		audioEngineContext.audioObjects[i].interfaceDOM.resize(event);
	}
}


function buttonSubmitClick() // TODO: Only when all songs have been played!
{
	var checks = testState.currentStateMap[testState.currentIndex].interfaces[0].options;
	var canContinue = true;
	
	// Check that the anchor and reference objects are correctly placed
	if (interfaceContext.checkHiddenAnchor() == false) {return;}
	if (interfaceContext.checkHiddenReference() == false) {return;}
	
	for (var i=0; i<checks.length; i++) {
		if (checks[i].type == 'check')
		{
			switch(checks[i].check) {
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

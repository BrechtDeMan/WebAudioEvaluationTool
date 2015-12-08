/**
 *  ape.js
 *  Create the APE interface
 */


// Once this is loaded and parsed, begin execution
loadInterface();

var clicking = -1;

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
	
	// Bindings for interfaceContext
	Interface.prototype.checkAllPlayed = function()
	{
		hasBeenPlayed = audioEngineContext.checkAllPlayed();
		if (hasBeenPlayed.length > 0) // if a fragment has not been played yet
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
	        return false;
	    }
	    return true;
	};
	
	Interface.prototype.checkAllMoved = function() {
		var audioObjs = audioEngineContext.audioObjects;
		var state = true;
		var strNums = [];
		for (var i=0; i<audioObjs.length; i++)
		{
			if (audioObjs[i].metric.wasMoved == false && audioObjs[i].specification.type != 'outsidereference') {
				state = false;
				strNums.push(i);
			}
		}
		if (state == false) {
			if (strNums.length > 1) {
				var str = "";
		    	for (var i=0; i<strNums.length; i++) {
		    		str = str + strNums[i];
		    		if (i < strNums.length-2){
		    			str += ", ";
		    		} else if (i == strNums.length-2) {
		    			str += " or ";
		    		}
		    	}
		    	alert('You have not moved fragments ' + str + ' yet. Please listen, rate and comment all samples before submitting.');
	       } else {
	       		alert('You have not moved fragment ' + strNums[0] + ' yet. Please listen, rate and comment all samples before submitting.');
	       }
		}
		return state;
	};
	
	Interface.prototype.checkAllCommented = function() {
		var audioObjs = audioEngineContext.audioObjects;
		var audioHolder = testState.stateMap[testState.stateIndex];
		var state = true;
		if (audioHolder.elementComments) {
			var strNums = [];
			for (var i=0; i<audioObjs.length; i++)
			{
				if (audioObjs[i].commentDOM.trackCommentBox.value.length == 0) {
					state = false;
					strNums.push(i);
				}
			}
			if (state == false) {
				if (strNums.length > 1) {
					var str = "";
			    	for (var i=0; i<strNums.length; i++) {
			    		str = str + strNums[i];
			    		if (i < strNums.length-2){
			    			str += ", ";
			    		} else if (i == strNums.length-2) {
			    			str += " or ";
			    		}
			    	}
			    	alert('You have not commented on fragments ' + str + ' yet. Please listen, rate and comment all samples before submitting.');
		       } else {
		       		alert('You have not commented on fragment ' + strNums[0] + ' yet. Please listen, rate and comment all samples before submitting.');
		       }
			}
		}
		return state;
	};
	
	Interface.prototype.checkScaleRange = function()
	{
		var audioObjs = audioEngineContext.audioObjects;
		var audioHolder = testState.stateMap[testState.stateIndex];
		var interfaces = audioHolder.interfaces;
		for (var i=0; i<interfaces.length; i++)
		{
			var minRanking = convSliderPosToRate(audioObjs[0].interfaceDOM.trackSliderObjects[i]);
			var maxRanking = minRanking;
			
			var minScale;
			var maxScale;
			for (var j=0; j<interfaces[i].options.length; j++)
			{
				if (interfaces[i].options[j].check == "scalerange") {
					minScale = interfaces[i].options[j].min;
					maxScale = interfaces[i].options[j].max;
					break;
				}
			}
			for (var j=1; j<audioObjs.length; j++){
				if (audioObjs[j].specification.type != 'outsidereference') {
					var ranking = convSliderPosToRate(audioObjs[j].interfaceDOM.trackSliderObjects[i]);
					if (ranking < minRanking) { minRanking = ranking;}
					if (ranking > maxRanking) { maxRanking = ranking;}
				}
			}
			if (minRanking > minScale || maxRanking < maxScale) {
				alert('Please use the full width of the scale');
				return false;
			}
		}
		return true;
	};
	
	Interface.prototype.objectSelected = null;
	Interface.prototype.objectMoved = false;
	Interface.prototype.selectObject = function(object)
	{
		if (this.objectSelected == null)
		{
			this.objectSelected = object;
			this.objectMoved = false;
		}
	};
	Interface.prototype.moveObject = function()
	{
		if (this.objectMoved == false)
		{
			this.objectMoved = true;
		}
	};
	Interface.prototype.releaseObject = function()
	{
		this.objectSelected = null;
		this.objectMoved = false;
	};
	Interface.prototype.getSelectedObject = function()
	{
		return this.objectSelected;
	};
	Interface.prototype.hasSelectedObjectMoved = function()
	{
		return this.objectMoved;
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
	
	var sliderHolder = document.createElement("div");
	sliderHolder.id = "slider-holder";
	
	
	// Global parent for the comment boxes on the page
	var feedbackHolder = document.createElement('div');
	feedbackHolder.id = 'feedbackHolder';
	
	testContent.style.zIndex = 1;
	interfaceContext.insertPoint.innerHTML = null; // Clear the current schema
	
	// Inject into HTML
	testContent.appendChild(title); // Insert the title
	testContent.appendChild(interfaceButtons);
	testContent.appendChild(sliderHolder);
	testContent.appendChild(feedbackHolder);
	interfaceContext.insertPoint.appendChild(testContent);

	// Load the full interface
	testState.initialise();
	testState.advanceState();
	
}

function loadTest(audioHolderObject)
{
	var width = window.innerWidth;
	var height = window.innerHeight;
	var id = audioHolderObject.id;
	
	var feedbackHolder = document.getElementById('feedbackHolder');
	var sliderHolder = document.getElementById('slider-holder');
	feedbackHolder.innerHTML = null;
	sliderHolder.innerHTML = null;
	
	var interfaceObj = audioHolderObject.interfaces;
	for (var k=0; k<interfaceObj.length; k++) {
		// Create the div box to center align
		var sliderBox = document.createElement('div');
		sliderBox.className = 'sliderCanvasDiv';
		sliderBox.id = 'sliderCanvasHolder-'+k;
		
		var pagetitle = document.createElement('div');
		pagetitle.className = "pageTitle";
		pagetitle.align = "center";
		var titleSpan = document.createElement('span');
		titleSpan.id = "pageTitle-"+k;
		if (interfaceObj[k].title != undefined && typeof interfaceObj[k].title == "string")
		{
			titleSpan.textContent = interfaceObj[k].title;
		}
		pagetitle.appendChild(titleSpan);
		sliderBox.appendChild(pagetitle);
		
		// Create the slider box to hold the slider elements
		var canvas = document.createElement('div');
		if (interfaceObj[k].name != undefined)
			canvas.id = 'slider-'+name;
		else
			canvas.id = 'slider-'+k;
		canvas.className = 'slider';
		canvas.align = "left";
		canvas.addEventListener('dragover',function(event){
			event.preventDefault();
			event.dataTransfer.effectAllowed = 'none';
			event.dataTransfer.dropEffect = 'copy';
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
		sliderHolder.appendChild(sliderBox);
		var positionScale = canvas.style.width.substr(0,canvas.style.width.length-2);
		var offset = Number(canvas.attributes['marginsize'].value);
		$(interfaceObj[k].scale).each(function(index,scaleObj){
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
		
		for (var i=0; i<interfaceObj[k].options.length; i++)
		{
			if (interfaceObj[k].options[i].type == 'option' && interfaceObj[k].options[i].name == 'playhead')
			{
				var playbackHolder = document.getElementById('playback-holder');
				if (playbackHolder == null)
				{
					playbackHolder = document.createElement('div');
					playbackHolder.style.width = "100%";
					playbackHolder.align = 'center';
					playbackHolder.appendChild(interfaceContext.playhead.object);
					feedbackHolder.appendChild(playbackHolder);
				}
			} else if (interfaceObj[k].options[i].type == 'option' && interfaceObj[k].options[i].name == 'page-count')
			{
				var pagecountHolder = document.getElementById('page-count');
				if (pagecountHolder == null)
				{
					pagecountHolder = document.createElement('div');
					pagecountHolder.id = 'page-count';
				}
				pagecountHolder.innerHTML = '<span>Test '+(audioHolderObject.presentedId+1)+' of '+specification.audioHolders.length+'</span>';
				var inject = document.getElementById('interface-buttons');
				inject.appendChild(pagecountHolder);
			}
		}
	}
	
	var commentBoxPrefix = "Comment on track";
	
	var commentShow = audioHolderObject.elementComments;
	
	var loopPlayback = audioHolderObject.loop;

	currentTestHolder = document.createElement('audioHolder');
	currentTestHolder.id = audioHolderObject.id;
	currentTestHolder.repeatCount = audioHolderObject.repeatCount;
	
	// Find all the audioElements from the audioHolder
	$(audioHolderObject.audioElements).each(function(index,element){
		// Find URL of track
		// In this jQuery loop, variable 'this' holds the current audioElement.
		
		// Now load each audio sample. First create the new track by passing the full URL
		var trackURL = audioHolderObject.hostURL + element.url;
		var audioObject = audioEngineContext.newTrack(element);
		
		var node = interfaceContext.createCommentBox(audioObject);
		
		// Create a slider per track
		audioObject.interfaceDOM = new sliderObject(audioObject,interfaceObj);
		if (audioObject.state == 1)
		{
			audioObject.interfaceDOM.enable();
		}
        
	});
	
	$('.track-slider').mousedown(function(event) {
		interfaceContext.selectObject($(this)[0]);
	});
	
	$('.track-slider').mousemove(function(event) {
		event.preventDefault();
	});
	
	$('.slider').mousemove(function(event) {
		event.preventDefault();
		var obj = interfaceContext.getSelectedObject();
		if (obj == null) {return;}
		$(obj).css("left",event.clientX + "px");
		interfaceContext.moveObject();
	});

	$(document).mouseup(function(event){
		event.preventDefault();
		var obj = interfaceContext.getSelectedObject();
		if (obj == null) {return;}
		if (interfaceContext.hasSelectedObjectMoved() == true)
		{
			var l = $(obj).css("left");
			var id = obj.getAttribute('trackIndex');
			var time = audioEngineContext.timer.getTestTime();
			var rate = convSliderPosToRate(obj);
			audioEngineContext.audioObjects[id].metric.moved(time,rate);
			console.log("slider "+id+" moved to "+rate+' ('+time+')');
		} else {
			var id = Number(obj.attributes['trackIndex'].value);
			//audioEngineContext.metric.sliderPlayed(id);
			audioEngineContext.play(id);
	        // Currently playing track red, rest green
	        
	        
	        $('.track-slider').removeClass('track-slider-playing');
	        var name = ".track-slider-"+obj.getAttribute("trackindex");
	        $(name).addClass('track-slider-playing');
	        $('.comment-div').removeClass('comment-box-playing');
	        $('#comment-div-'+id).addClass('comment-box-playing');
	        var outsideReference = document.getElementById('outside-reference');
	        if (outsideReference != undefined)
	        $(outsideReference).removeClass('track-slider-playing');
		}
		interfaceContext.releaseObject();
	});
	
	
	if (commentShow) {
		interfaceContext.showCommentBoxes(feedbackHolder,true);
	}
	
	$(audioHolderObject.commentQuestions).each(function(index,element) {
		var node = interfaceContext.createCommentQuestion(element);
		feedbackHolder.appendChild(node.holder);
	});
	
	// Construct outside reference;
	if (audioHolderObject.outsideReference != null) {
		var outsideReferenceHolder = document.createElement('div');
		outsideReferenceHolder.id = 'outside-reference';
		outsideReferenceHolderspan = document.createElement('span');
		outsideReferenceHolderspan.textContent = 'Reference';
		outsideReferenceHolder.appendChild(outsideReferenceHolderspan);
		
		var audioObject = audioEngineContext.newTrack(audioHolderObject.outsideReference);
		
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
	
	
	//testWaitIndicator();
}

function sliderObject(audioObject,interfaceObjects) {
	// Create a new slider object;
	this.parent = audioObject;
	this.trackSliderObjects = [];
	for (var i=0; i<interfaceObjects.length; i++)
	{
		var trackObj = document.createElement('div');
		trackObj.className = 'track-slider track-slider-disabled track-slider-'+audioObject.id;
		trackObj.id = 'track-slider-'+i+'-'+audioObject.id;
		trackObj.setAttribute('trackIndex',audioObject.id);
		trackObj.innerHTML = '<span>'+audioObject.id+'</span>';
		if (interfaceObjects[i].name != undefined) {
			trackObj.setAttribute('interface-name',interfaceObjects[i].name);
		} else {
			trackObj.setAttribute('interface-name',i);
		}
		this.trackSliderObjects.push(trackObj);
		var slider = document.getElementById("slider-"+trackObj.getAttribute("interface-name"));
		var offset = Number(slider.attributes['marginsize'].value);
		// Distribute it randomnly
		var w = window.innerWidth - (offset+8)*2;
		w = Math.random()*w;
		w = Math.floor(w+(offset+8));
		trackObj.style.left = w+'px';
		slider.appendChild(trackObj);
	}

	// Onclick, switch playback to that track
	
	this.enable = function() {
		if (this.parent.state == 1)
		{
			$(this.trackSliderObjects).each(function(i,trackObj){
				$(trackObj).removeClass('track-slider-disabled');
			});
		}
	};
	
	this.exportXMLDOM = function(audioObject) {
		// Called by the audioObject holding this element. Must be present
		var obj = [];
		$(this.trackSliderObjects).each(function(i,trackObj){
			var node = document.createElement('value');
			node.setAttribute("name",trackObj.getAttribute("interface-name"));
			node.textContent = convSliderPosToRate(trackObj);
			obj.push(node);
		});
		
		return obj;
	};
	this.getValue = function() {
		return convSliderPosToRate(this.trackSliderObj);
	};
}

function buttonSubmitClick()
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
			case 'scalerange':
				// Check the scale is used to its full width outlined by the node
				var checkState = interfaceContext.checkScaleRange();
				if (checkState == false) {canContinue = false;}
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
	            alert('You have not started the test! Please click a fragment to begin the test!');
	            return;
	        }
	    }
	    testState.advanceState();
    } 
}

function convSliderPosToRate(trackSlider)
{
	var slider = trackSlider.parentElement;
	var w = slider.style.width;
	var marginsize = Number(slider.attributes['marginsize'].value);
	var maxPix = w.substr(0,w.length-2);
	var pix = trackSlider.style.left;
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
		holdValues.push(convSliderPosToRate(sliderObj));
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
	// MANDATORY
	// Saves a specific test page
	// You can use this space to add any extra nodes to your XML saves
}
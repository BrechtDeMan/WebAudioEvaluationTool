/**
 *  ape.js
 *  Create the APE interface
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
	
	// Bindings for interfaceContext
	interfaceContext.checkAllPlayed = function()
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
	
	interfaceContext.checkAllMoved = function() {
		var state = true;
		var str = 'You have not moved the following sliders. ';
		for (var i=0; i<this.interfaceSliders.length; i++)
		{
			var interfaceTID = [];
			for (var j=0; j<this.interfaceSliders[i].metrics.length; j++)
			{
				if (this.interfaceSliders[i].metrics[j].wasMoved == false)
				{
					state = false;
					interfaceTID.push(j);
				}
			}
			if (interfaceTID.length != 0)
			{
				var interfaceName = this.interfaceSliders[i].interfaceObject.title;
				if (interfaceName == undefined) {
					str += 'On axis '+String(i+1)+' you must move ';
				} else {
					str += 'On axis "'+interfaceName+'" you must move ';
				}
				if (interfaceTID.length == 1)
				{
					str += 'slider '+interfaceTID[0]+'. ';
				}
				else {
					str += 'sliders ';
					for (var k=0; k<interfaceTID.length-1; k++)
					{
						str += interfaceTID[k]+', ';
					}
					str += interfaceTID[interfaceTID.length-1] +'. ';
				}
			}
		}
		if (state != true)
		{
			alert(str);
			console.log(str);
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
		var state = true;
		var str = '';
		for (var i=0; i<this.interfaceSliders.length; i++)
		{
			var minScale;
			var maxScale;
			var interfaceObject = interfaceContext.interfaceSliders[0].interfaceObject;
			for (var j=0; j<interfaceObject.options.length; j++)
			{
				if (interfaceObject.options[j].check == "scalerange") {
					minScale = interfaceObject.options[j].min;
					maxScale = interfaceObject.options[j].max;
					break;
				}
			}
			var minRanking = convSliderPosToRate(this.interfaceSliders[i].sliders[0]);
			var maxRanking = minRanking;
			for (var j=1; j<this.interfaceSliders[i].sliders.length; j++)
			{
				var ranking = convSliderPosToRate(this.interfaceSliders[i].sliders[j]);
				if (ranking < minRanking)
				{
					minRanking = ranking;
				} else if (ranking > maxRanking)
				{
					maxRanking = ranking;
				}
			}
			if (minRanking > minScale || maxRanking < maxScale)
			{
				state = false;
				str += 'On axis "'+this.interfaceSliders[i].interfaceObject.title+'" you have not used the full width of the scale. ';
			}
		}
		if (state != true)
		{
			alert(str);
			console.log(str);
		}
		return state;
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
	
	// Bindings for slider interfaces
	Interface.prototype.interfaceSliders = [];
	
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
	
	interfaceContext.interfaceSliders = [];
	
	var feedbackHolder = document.getElementById('feedbackHolder');
	var sliderHolder = document.getElementById('slider-holder');
	feedbackHolder.innerHTML = null;
	sliderHolder.innerHTML = null;
	
	// Delete outside reference
	var outsideReferenceHolder = document.getElementById('outside-reference');
	if (outsideReferenceHolder != null) {
		document.getElementById('interface-buttons').removeChild(outsideReferenceHolder);
	}
	
	var interfaceObj = audioHolderObject.interfaces;
	for (var k=0; k<interfaceObj.length; k++) {
		// Create the div box to center align
		interfaceContext.interfaceSliders.push(new interfaceSliderHolder(interfaceObj[k]));
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
				pagecountHolder.innerHTML = '<span>Page '+(audioHolderObject.presentedId+1)+' of '+specification.audioHolders.length+'</span>';
				var inject = document.getElementById('interface-buttons');
				inject.appendChild(pagecountHolder);
			}
		}
	}
	
	var commentBoxPrefix = "Comment on fragment";
	
	var commentShow = audioHolderObject.elementComments;
	
	var loopPlayback = audioHolderObject.loop;

	currentTestHolder = document.createElement('audioHolder');
	currentTestHolder.id = audioHolderObject.id;
	currentTestHolder.repeatCount = audioHolderObject.repeatCount;
	
	// Find all the audioElements from the audioHolder
	$(audioHolderObject.audioElements).each(function(index,element){
		// Find URL of track
		// In this jQuery loop, variable 'this' holds the current audioElement.
		
		// Check if an outside reference
		if (element.type == 'outside-reference')
		{
			// Construct outside reference;
			var outsideReferenceHolder = document.createElement('div');
			outsideReferenceHolder.id = 'outside-reference';
			outsideReferenceHolder.className = 'outside-reference';
			outsideReferenceHolderspan = document.createElement('span');
			outsideReferenceHolderspan.textContent = 'Reference';
			outsideReferenceHolder.appendChild(outsideReferenceHolderspan);
			
			var audioObject = audioEngineContext.newTrack(element);
			
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
			return;
		}
		
		// Now load each audio sample. First create the new track by passing the full URL
		var trackURL = audioHolderObject.hostURL + element.url;
		var audioObject = audioEngineContext.newTrack(element);
		
		var node = interfaceContext.createCommentBox(audioObject);
		// Create a slider per track
		var sliderNode = new sliderObject(audioObject,interfaceObj);
		audioObject.bindInterface(sliderNode);
	});
	
	// Initialse the interfaceSlider object metrics
	
	$('.track-slider').mousedown(function(event) {
		interfaceContext.selectObject($(this)[0]);
	});
	$('.track-slider').on('touchstart',null,function(event) {
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
	
	$('.slider').on('touchmove',null,function(event) {
		event.preventDefault();
		var obj = interfaceContext.getSelectedObject();
		if (obj == null) {return;}
		var move = event.originalEvent.targetTouches[0].clientX - 6;
		$(obj).css("left",move + "px");
		interfaceContext.moveObject();
	});

	$(document).mouseup(function(event){
		event.preventDefault();
		var obj = interfaceContext.getSelectedObject();
		if (obj == null) {return;}
		var interfaceID = obj.parentElement.getAttribute("interfaceid");
		var trackID = obj.getAttribute("trackindex");
		if (interfaceContext.hasSelectedObjectMoved() == true)
		{
			var l = $(obj).css("left");
			var id = obj.getAttribute('trackIndex');
			var time = audioEngineContext.timer.getTestTime();
			var rate = convSliderPosToRate(obj);
			audioEngineContext.audioObjects[id].metric.moved(time,rate);
			interfaceContext.interfaceSliders[interfaceID].metrics[trackID].moved(time,rate);
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
	
	$('.slider').on('touchend',null,function(event){
		var obj = interfaceContext.getSelectedObject();
		if (obj == null) {return;}
		var interfaceID = obj.parentElement.getAttribute("interfaceid");
		var trackID = obj.getAttribute("trackindex");
		if (interfaceContext.hasSelectedObjectMoved() == true)
		{
			var l = $(obj).css("left");
			var id = obj.getAttribute('trackIndex');
			var time = audioEngineContext.timer.getTestTime();
			var rate = convSliderPosToRate(obj);
			audioEngineContext.audioObjects[id].metric.moved(time,rate);
			interfaceContext.interfaceSliders[interfaceID].metrics[trackID].moved(time,rate);
			console.log("slider "+id+" moved to "+rate+' ('+time+')');
		}
		interfaceContext.releaseObject();
	});
	
	
	if (audioHolderObject.showElementComments) {
		interfaceContext.showCommentBoxes(feedbackHolder,true);
	}
	
	$(audioHolderObject.commentQuestions).each(function(index,element) {
		var node = interfaceContext.createCommentQuestion(element);
		feedbackHolder.appendChild(node.holder);
	});
	
	
	//testWaitIndicator();
}

function interfaceSliderHolder(interfaceObject)
{
	this.sliders = [];
	this.metrics = [];
	this.id = document.getElementsByClassName("sliderCanvasDiv").length;
	this.name = interfaceObject.name;
	this.interfaceObject = interfaceObject;
	this.sliderDOM = document.createElement('div');
	this.sliderDOM.className = 'sliderCanvasDiv';
	this.sliderDOM.id = 'sliderCanvasHolder-'+this.id;
	
	var pagetitle = document.createElement('div');
	pagetitle.className = "pageTitle";
	pagetitle.align = "center";
	var titleSpan = document.createElement('span');
	titleSpan.id = "pageTitle-"+this.id;
	if (interfaceObject.title != undefined && typeof interfaceObject.title == "string")
	{
		titleSpan.textContent = interfaceObject.title;
	} else {
		titleSpan.textContent = "Axis "+String(this.id+1);
	}
	pagetitle.appendChild(titleSpan);
	this.sliderDOM.appendChild(pagetitle);
	
	// Create the slider box to hold the slider elements
	this.canvas = document.createElement('div');
	if (this.name != undefined)
		this.canvas.id = 'slider-'+this.name;
	else
		this.canvas.id = 'slider-'+this.id;
	this.canvas.setAttribute("interfaceid",this.id);
	this.canvas.className = 'slider';
	this.canvas.align = "left";
	this.canvas.addEventListener('dragover',function(event){
		event.preventDefault();
		event.dataTransfer.effectAllowed = 'none';
		event.dataTransfer.dropEffect = 'copy';
		return false;
	},false);
	var sliderMargin = document.createAttribute('marginsize');
	sliderMargin.nodeValue = 42; // Set default margins to 42px either side
	// Must have a known EXACT width, as this is used later to determine the ratings
	var w = (Number(sliderMargin.nodeValue)+8)*2;
	this.canvas.style.width = window.innerWidth - w +"px";
	this.canvas.style.marginLeft = sliderMargin.nodeValue +'px';
	this.canvas.setAttributeNode(sliderMargin);
	this.sliderDOM.appendChild(this.canvas);
	
	// Create the div to hold any scale objects
	this.scale = document.createElement('div');
	this.scale.className = 'sliderScale';
	this.scale.id = 'sliderScaleHolder-'+this.id;
	this.scale.align = 'left';
	this.sliderDOM.appendChild(this.scale);
	var positionScale = this.canvas.style.width.substr(0,this.canvas.style.width.length-2);
	var offset = Number(this.canvas.attributes['marginsize'].value);
	for (var scaleObj of interfaceObject.scales)
	{
		var value = document.createAttribute('value');
		var position = Number(scaleObj.position)*0.01;
		value.nodeValue = position;
		var pixelPosition = (position*positionScale)+offset;
		var scaleDOM = document.createElement('span');
		scaleDOM.textContent = scaleObj.text;
		this.scale.appendChild(scaleDOM);
		scaleDOM.style.left = Math.floor((pixelPosition-($(scaleDOM).width()/2)))+'px';
		scaleDOM.setAttributeNode(value);
	}
	
	var dest = document.getElementById("slider-holder");
	dest.appendChild(this.sliderDOM);
	
	this.createSliderObject = function(audioObject)
	{
		var trackObj = document.createElement('div');
		trackObj.className = 'track-slider track-slider-disabled track-slider-'+audioObject.id;
		trackObj.id = 'track-slider-'+this.id+'-'+audioObject.id;
		trackObj.setAttribute('trackIndex',audioObject.id);
		trackObj.innerHTML = '<span>'+audioObject.id+'</span>';
		if (this.name != undefined) {
			trackObj.setAttribute('interface-name',this.name);
		} else {
			trackObj.setAttribute('interface-name',this.id);
		}
		var offset = Number(this.canvas.attributes['marginsize'].value);
		// Distribute it randomnly
		var w = window.innerWidth - (offset+8)*2;
		w = Math.random()*w;
		w = Math.floor(w+(offset+8));
		trackObj.style.left = w+'px';
		this.canvas.appendChild(trackObj);
		this.sliders.push(trackObj);
		this.metrics.push(new metricTracker(this));
		this.metrics[this.metrics.length-1].initialise(convSliderPosToRate(trackObj));
		return trackObj;
	};
	
	this.resize = function(event)
	{
		var holdValues = [];
		for (var index = 0; index < this.sliders.length; index++)
		{
			holdValues.push(convSliderPosToRate(this.sliders[index])); 
		}
		var width = event.target.innerWidth;
		var sliderDiv = this.canvas;
		var sliderScaleDiv = this.scale;
		var marginsize = Number(sliderDiv.attributes['marginsize'].value);
		var w = (marginsize+8)*2;
		sliderDiv.style.width = width - w + 'px';
		var width = width - w;
		// Move sliders into new position
		for (var index = 0; index < this.sliders.length; index++)
		{
			var pos = holdValues[index];
			var pix = pos * width;
			this.sliders[index].style.left = pix+marginsize+'px';
		}
		
		// Move scale labels
		for (var index = 0; index < this.scale.children.length; index++)
		{
			var scaleObj = this.scale.children[index];
			var position = Number(scaleObj.attributes['value'].value);
			var pixelPosition = (position*width)+marginsize;
			scaleObj.style.left = Math.floor((pixelPosition-($(scaleObj).width()/2)))+'px';
		}
	};
}

function sliderObject(audioObject,interfaceObjects) {
	// Create a new slider object;
	this.parent = audioObject;
	this.trackSliderObjects = [];
	for (var i=0; i<interfaceContext.interfaceSliders.length; i++)
	{
		var trackObj = interfaceContext.interfaceSliders[i].createSliderObject(audioObject);
		this.trackSliderObjects.push(trackObj);
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
	this.updateLoading = function(progress)
	{
		if (progress != 100)
		{
			progress = String(progress);
			progress = progress.split('.')[0];
			this.trackSliderObjects[0].children[0].textContent = progress+'%';
		} else {
			this.trackSliderObjects[0].children[0].textContent = this.parent.id;
		}
	};
	this.exportXMLDOM = function(audioObject) {
		// Called by the audioObject holding this element. Must be present
		var obj = [];
		$(this.trackSliderObjects).each(function(i,trackObj){
			var node = document.createElement('value');
			node.setAttribute("interface-name",trackObj.getAttribute("interface-name"));
			node.textContent = convSliderPosToRate(trackObj);
			obj.push(node);
		});
		
		return obj;
	};
	this.getValue = function() {
		return convSliderPosToRate(this.trackSliderObjects[0]);
	};
}

function buttonSubmitClick()
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
			default:
				console.log("WARNING - Check option "+checks[i].name+" is not supported on this interface");
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
	
	// Resize the slider objects
	for (var i=0; i<interfaceContext.interfaceSliders.length; i++)
	{
		interfaceContext.interfaceSliders[i].resize(event);
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
	
	if (interfaceContext.interfaceSliders.length == 1)
	{
		// If there is only one axis, there only needs to be one metric return
		return;
	}
	var audioelements = store.getElementsByTagName("audioelement");
	for (var i=0; i<audioelements.length; i++)
	{
		// Have to append the metric specific nodes
		if (pageSpecification.outsideReference == null || pageSpecification.outsideReference.id != audioelements[i].id)
		{
			var inject = audioelements[i].getElementsByTagName("metric");
			if (inject.length == 0)
			{
				inject = storage.document.createElement("metric");
			} else {
				inject = inject[0];
			}
			for (var k=0; k<interfaceContext.interfaceSliders.length; k++)
			{
				var mrnodes = interfaceContext.interfaceSliders[k].metrics[i].exportXMLDOM(inject);
				for (var j=0; j<mrnodes.length; j++)
				{
					var name = mrnodes[j].getAttribute("name");
					if (name == "elementTracker" || name == "elementTrackerFull" || name == "elementInitialPosition" || name == "elementFlagMoved")
					{
						mrnodes[j].setAttribute("interface-name",interfaceContext.interfaceSliders[k].name);
						mrnodes[j].setAttribute("interface-id",k);
						inject.appendChild(mrnodes[j]);
					}
				}
			}
		}
	}
}
// Once this is loaded and parsed, begin execution
loadInterface();

function loadInterface() {
	// Get the dimensions of the screen available to the page
	var width = window.innerWidth;
	var height = window.innerHeight;
	interfaceContext.insertPoint.innerHTML = null; // Clear the current schema
	
	// Custom comparator Object
	Interface.prototype.comparator = null;
	
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
    boxes.style.float = "left";
	
	var submit = document.createElement('button');
	submit.id = "submit";
	submit.onclick = buttonSubmitClick;
	submit.className = "big-button";
	submit.textContent = "submit";
	submit.style.position = "relative";
	submit.style.left = (window.innerWidth-250)/2 + 'px';
		
	feedbackHolder.appendChild(boxes);
	
	// Inject into HTML
	testContent.appendChild(title); // Insert the title
	testContent.appendChild(pagetitle);
	testContent.appendChild(interfaceButtons);
	testContent.appendChild(feedbackHolder);
	testContent.appendChild(submit);
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
    
    var interfaceOptions = specification.interfaces.options.concat(interfaceObj.options);
    for (var option of interfaceOptions)
    {
        if (option.type == "show")
        {
            switch(option.name) {
                case "playhead":
                    var playbackHolder = document.getElementById('playback-holder');
                    if (playbackHolder == null)
                    {
                        playbackHolder = document.createElement('div');
                        playbackHolder.style.width = "100%";
                        playbackHolder.style.float = "left";
                        playbackHolder.align = 'center';
                        playbackHolder.appendChild(interfaceContext.playhead.object);
                        feedbackHolder.appendChild(playbackHolder);
                    }
                    break;
                case "page-count":
                    var pagecountHolder = document.getElementById('page-count');
                    if (pagecountHolder == null)
                    {
                        pagecountHolder = document.createElement('div');
                        pagecountHolder.id = 'page-count';
                    }
                    pagecountHolder.innerHTML = '<span>Page '+(audioHolderObject.presentedId+1)+' of '+specification.pages.length+'</span>';
                    var inject = document.getElementById('interface-buttons');
                    inject.appendChild(pagecountHolder);
                    break;
                case "volume":
                    if (document.getElementById('master-volume-holder') == null)
                    {
                        feedbackHolder.appendChild(interfaceContext.volume.object);
                    }
                    break;
            }
        }
    }
	
	// Populate the comparator object
	interfaceContext.comparator = new comparator(audioHolderObject);
    if (audioHolderObject.showElementComments)
    {
        var commentHolder = document.createElement('div');
        commentHolder.id = 'commentHolder';
        document.getElementById('testContent').appendChild(commentHolder);
        // Generate one comment box per presented page
        for (var element of audioEngineContext.audioObjects)
        {
            interfaceContext.createCommentBox(element);
        }
        interfaceContext.showCommentBoxes(commentHolder,true);
    }
	resizeWindow(null);
}

function comparator(audioHolderObject)
{	
	this.comparatorBox = function(audioElement,id,text)
	{
		this.parent = audioElement;
		this.id = id;
		this.value = 0;
		this.disabled = true;
		this.box = document.createElement('div');
		this.box.className = 'comparator-holder';
		this.box.setAttribute('track-id',audioElement.id);
		this.box.id = 'comparator-'+text;
		this.selector = document.createElement('div');
		this.selector.className = 'comparator-selector disabled';
		var selectorText = document.createElement('span');
		selectorText.textContent = text;
		this.selector.appendChild(selectorText);
		this.playback = document.createElement('button');
		this.playback.className = 'comparator-button';
		this.playback.disabled = true;
		this.playback.textContent = "Listen";
		this.box.appendChild(this.selector);
		this.box.appendChild(this.playback);
		this.selector.onclick = function(event)
		{
			var time = audioEngineContext.timer.getTestTime();
			if ($(event.currentTarget).hasClass('disabled'))
			{
				console.log("Please wait until sample has loaded");
				return;
			}
			if (audioEngineContext.status == 0)
			{
				alert("Please listen to the samples before making a selection");
				console.log("Please listen to the samples before making a selection");
				return;
            }
			var id = event.currentTarget.parentElement.getAttribute('track-id');
			interfaceContext.comparator.selected = id;
            if ($(event.currentTarget).hasClass("selected")) {
                $(".comparator-selector").removeClass('selected');
                for (var i=0; i<interfaceContext.comparator.comparators.length; i++)
                {
                     var obj = interfaceContext.comparator.comparators[i];
                    obj.parent.metric.moved(time,0);
                }
            } else {
                $(".comparator-selector").removeClass('selected');
                $(event.currentTarget).addClass('selected');
                for (var i=0; i<interfaceContext.comparator.comparators.length; i++)
                {
                    var obj = interfaceContext.comparator.comparators[i];
                    if (i == id) {
                        obj.value = 1;
                    } else {
                        obj.value = 0;
                    }
                    obj.parent.metric.moved(time,obj.value);
                }
                console.log("Selected "+id+' ('+time+')');
            }
		};
        this.playback.setAttribute("playstate","ready");
		this.playback.onclick = function(event)
		{
			var id = event.currentTarget.parentElement.getAttribute('track-id');
            if (event.currentTarget.getAttribute("playstate") == "ready")
            {
                audioEngineContext.play(id);
            } else if (event.currentTarget.getAttribute("playstate") == "playing") {
                audioEngineContext.stop();
            }
			
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
				this.playback.textContent = "Play";
			}
		};
        this.startPlayback = function()
        {
            $('.comparator-button').text('Listen');
            $(this.playback).text('Stop');
            this.playback.setAttribute("playstate","playing");
        };
        this.stopPlayback = function()
        {
            $(this.playback).text('Listen');
            this.playback.setAttribute("playstate","ready");
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
		this.getPresentedId = function()
		{
			return this.selector.children[0].textContent;
		};
		this.canMove = function()
		{
			return false;
		};
	};
	
	this.boxHolders = document.getElementById('box-holders');
	this.boxHolders.innerHTML = null;
	this.comparators = [];
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
		var node = new this.comparatorBox(audioObject,index,String.fromCharCode(65 + index));
		audioObject.bindInterface(node);
		this.comparators.push(node);
		this.boxHolders.appendChild(node.box);
	}
	return this;
}

function resizeWindow(event)
{
	document.getElementById('submit').style.left = (window.innerWidth-250)/2 + 'px';
	var numObj = interfaceContext.comparator.comparators.length;
	var boxW = numObj*312;
    var diff = window.innerWidth - boxW;
    while (diff < 0)
    {
        numObj = Math.ceil(numObj/2);
        boxW = numObj*312;
        diff = window.innerWidth - boxW;
    }
    document.getElementById('box-holders').style.marginLeft = diff/2 + 'px';
    document.getElementById('box-holders').style.marginRight = diff/2 + 'px';
    document.getElementById('box-holders').style.width = boxW + 'px';
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
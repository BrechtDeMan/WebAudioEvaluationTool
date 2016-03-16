/**
 * WAET Blank Template
 * Use this to start building your custom interface
 */

// Once this is loaded and parsed, begin execution
loadInterface();

function loadInterface() {
	// Use this to do any one-time page / element construction. For instance, placing any stationary text objects,
	// holding div's, or setting up any nodes which are present for the entire test sequence
    
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
};

function loadTest(page)
{
	// Called each time a new test page is to be build. The page specification node is the only item passed in
    interfaceContext.comparator = new comparator(page);
}

function comparator(page)
{
    // Build prototype constructor
    this.interfaceObject = function(element,label)
    {
        // An example node, you can make this however you want for each audioElement.
        // However, every audioObject (audioEngineContext.audioObject) MUST have an interface object with the following
        // You attach them by calling audioObject.bindInterface( )
        this.parent = element;
        this.id = element.id;
        this.value = 0;
        this.disabled = true;
        this.box = document.createElement('div');
        this.box.className = 'comparator-holder';
		this.box.setAttribute('track-id',element.id);
		this.box.id = 'comparator-'+label;
        this.selector = document.createElement('div');
		this.selector.className = 'comparator-selector disabled';
		var selectorText = document.createElement('span');
		selectorText.textContent = label;
		this.selector.appendChild(selectorText);
		this.playback = document.createElement('button');
		this.playback.className = 'comparator-button';
		this.playback.disabled = true;
		this.playback.textContent = "Listen";
		this.box.appendChild(this.selector);
		this.box.appendChild(this.playback);
        this.selector.onclick = function(event)
		{
            var label = event.currentTarget.children[0].textContent;
            if (label == "X" || label == "x") {return;}
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
            // This is used to tell the interface object that playback of this node is ready
            if (this.parent.state == 1)
			{
				$(this.selector).removeClass('disabled');
				this.playback.disabled = false;
			}
        };
        this.updateLoading = function(progress)
        {
            // progress is a value from 0 to 100 indicating the current download state of media files
            if (progress != 100)
			{
				progress = String(progress);
				progress = progress.split('.')[0];
				this.playback.textContent = progress+'%';
			} else {
				this.playback.textContent = "Play";
			}
        };
        this.error = function() {
            // audioObject has an error!!
            this.playback.textContent = "Error";
            $(this.playback).addClass("error-colour");
        };
        this.startPlayback = function()
        {
            // Called when playback has begun
            $('.comparator-button').text('Listen');
            $(this.playback).text('Stop');
            this.playback.setAttribute("playstate","playing");
        };
        this.stopPlayback = function()
        {
            // Called when playback has stopped. This gets called even if playback never started!
            $(this.playback).text('Listen');
            this.playback.setAttribute("playstate","ready");
        };
        this.getValue = function()
        {
            // Return the current value of the object. If there is no value, return 0
            return this.value;
        };
        this.getPresentedId = function()
        {
            // Return the presented ID of the object. For instance, the APE has sliders starting from 0. Whilst AB has alphabetical scale
            return this.selector.children[0].textContent;
        };
        this.canMove = function()
        {
            // Return either true or false if the interface object can be moved. AB / Reference cannot, whilst sliders can and therefore have a continuous scale.
            // These are checked primarily if the interface check option 'fragmentMoved' is enabled.
            return false;
        };
        this.exportXMLDOM = function(audioObject) {
            // Called by the audioObject holding this element to export the interface <value> node.
            // If there is no value node (such as outside reference), return null
            // If there are multiple value nodes (such as multiple scale / 2D scales), return an array of nodes with each value node having an 'interfaceName' attribute
            // Use storage.document.createElement('value'); to generate the XML node.
            var node = storage.document.createElement('value');
			node.textContent = this.value;
			return node;

        };
        this.error = function() {
            // If there is an error with the audioObject, this will be called to indicate a failure
        }
    };
    // Ensure there are only two comparisons per page
    if (page.audioElements.length != 2) {
        console.error('FATAL - There must be 2 <audioelement> nodes on each <page>: '+page.id);
        return;
    }
    // Build the three audio elements
    this.pair = [];
    this.X = null;
    this.boxHolders = document.getElementById('box-holders');
    for (var index=0; index<page.audioElements.length; index++) {
        var element = page.audioElements[index];
        if (element.type != 'normal')
		{
			console.log("WARNING - ABX can only have normal elements. Page "+page.id+", Element "+element.id);
            element.type = "normal";
		}
        var audioObject = audioEngineContext.newTrack(element);
        var label;
        switch(audioObject.specification.parent.label) {
            case "none":
                label = "";
                break;
            case "number":
                label = ""+index;
                break;
            case "letter":
                label = String.fromCharCode(97 + index);
                break;
            default:
                label = String.fromCharCode(65 + index);
                break;
        }
        var node = new this.interfaceObject(audioObject,label);
        audioObject.bindInterface(node);
        this.pair.push(node);
        this.boxHolders.appendChild(node.box);
    }
    var elementId = Math.floor(Math.random() * 2); //Randomly pick A or B to be X
    var element = new page.audioElementNode();
    for (var atr in page.audioElements[elementId]) {
        eval("element."+atr+" = page.audioElements[elementId]."+atr);
    }
    element.id += "-X";
    if (typeof element.name == "string") {element.name+="-X";}
    page.audioElements.push(element);
    // Create the save place-holder for the 'X' element
    var root = testState.currentStore.XMLDOM;
    var aeNode = storage.document.createElement('audioelement');
    aeNode.setAttribute('ref',element.id);
    if (typeof element.name == "string"){aeNode.setAttribute('name',element.name);}
    aeNode.setAttribute('type','normal');
    aeNode.setAttribute('url',element.url);
    aeNode.setAttribute('gain',element.gain);
    aeNode.appendChild(storage.document.createElement('metric'));
    root.appendChild(aeNode);
    // Build the 'X' element
    var audioObject = audioEngineContext.newTrack(element);
    var label;
    switch(audioObject.specification.parent.label) {
        case "letter":
            label = "x";
            break;
        default:
            label = "X";
            break;
    }
    var node = new this.interfaceObject(audioObject,label);
    audioObject.bindInterface(node);
    this.X = node;
    this.boxHolders.appendChild(node.box);
}

function resizeWindow(event)
{
	// Called on every window resize event, use this to scale your page properly
}

function buttonSubmitClick()
{
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
/**
 * WAET Blank Template
 * Use this to start building your custom interface
 */
/*globals window, interfaceContext, testState, Interface, audioEngineContext, console, document, specification, $, storage*/
// Once this is loaded and parsed, begin execution
loadInterface();

function loadInterface() {
    // Use this to do any one-time page / element construction. For instance, placing any stationary text objects,
    // holding div's, or setting up any nodes which are present for the entire test sequence

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
    titleSpan.id = "test-title";

    // Set title to that defined in XML, else set to default
    if (titleAttr !== undefined) {
        titleSpan.textContent = titleAttr;
    } else {
        titleSpan.textContent = 'Listening test';
    }
    // Insert the titleSpan element into the title div element.
    title.appendChild(titleSpan);

    var pagetitle = document.createElement('div');
    pagetitle.className = "pageTitle";
    pagetitle.align = "center";

    titleSpan = document.createElement('span');
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
    playback.onclick = function () {
        if (audioEngineContext.status == 1) {
            audioEngineContext.stop();
            this.innerHTML = 'Stop';
            var time = audioEngineContext.timer.getTestTime();
            console.log('Stopped at ' + time); // DEBUG/SAFETY
        }
    };
    // Create Submit (save) button
    var submit = document.createElement("button");
    submit.innerHTML = 'Next';
    submit.onclick = buttonSubmitClick;
    submit.id = 'submit-button';
    submit.style.float = 'left';

    // Create the sort button
    var sort = document.createElement("button");
    sort.id = "sort-fragments";
    sort.textContent = "Sort";
    sort.style.display = "inline-block";
    sort.style.visibility = "hidden";
    sort.onclick = buttonSortFragmentClick;

    // Append the interface buttons into the interfaceButtons object.
    interfaceButtons.appendChild(playback);
    interfaceButtons.appendChild(submit);
    interfaceButtons.appendChild(sort);


    // Create outside reference holder
    var outsideRef = document.createElement("div");
    outsideRef.id = "outside-reference-holder";

    // Create a holder for the slider rows
    var sliderBox = document.createElement("div");
    sliderBox.id = 'slider-box';
    var sliderGrid = document.createElement("div");
    sliderGrid.id = "slider-grid";
    sliderBox.appendChild(sliderGrid);
    var scaleText = document.createElement('div');
    scaleText.id = "scale-text-holder";
    sliderGrid.appendChild(scaleText);


    // Global parent for the comment boxes on the page
    var feedbackHolder = document.createElement('div');
    feedbackHolder.id = 'feedbackHolder';

    testContent.style.zIndex = 1;
    interfaceContext.insertPoint.innerHTML = ""; // Clear the current schema

    // Inject into HTML
    testContent.appendChild(title); // Insert the title
    testContent.appendChild(pagetitle);
    testContent.appendChild(interfaceButtons);
    testContent.appendChild(outsideRef);
    testContent.appendChild(sliderBox);
    testContent.appendChild(feedbackHolder);
    interfaceContext.insertPoint.appendChild(testContent);

    // Load the full interface
    testState.initialise();
    testState.advanceState();
}

function loadTest(page) {
    // Called each time a new test page is to be build. The page specification node is the only item passed in

    var feedbackHolder = document.getElementById('feedbackHolder');
    var sliderBox = document.getElementById('slider-box');
    var sliderGrid = document.getElementById("slider-grid");
    var scaleTextHolder = document.getElementById("scale-text-holder");
    var interfaceObj = interfaceContext.getCombinedInterfaces(page);
    var commentBoxPrefix = "Comment on track";
    var loopPlayback = page.loop;
    feedbackHolder.innerHTML = "";

    if (interfaceObj.length > 1) {
        console.log("WARNING - This interface only supports one <interface> node per page. Using first interface node");
    }
    interfaceObj = interfaceObj[0];

    // Set the page title
    if (typeof page.title == "string" && page.title.length > 0) {
        document.getElementById("test-title").textContent = page.title;
    }
    // Set the axis title
    if (interfaceObj.title !== null) {
        document.getElementById("pageTitle").textContent = interfaceObj.title;
    }

    if (interfaceObj.image !== undefined || page.audioElements.some(function (elem) {
            return elem.image !== undefined;
        })) {
        document.getElementById("testContent").insertBefore(interfaceContext.imageHolder.root, document.getElementById("slider"));
        interfaceContext.imageHolder.setImage(interfaceObj.image);
    }

    // Delete outside reference
    document.getElementById("outside-reference-holder").innerHTML = "";

    // Get the comment box prefix
    if (interfaceObj.commentBoxPrefix !== undefined) {
        commentBoxPrefix = interfaceObj.commentBoxPrefix;
    }

    // Populate the comment questions
    $(page.commentQuestions).each(function (index, element) {
        var node = interfaceContext.createCommentQuestion(element);
        feedbackHolder.appendChild(node.holder);
    });

    // Configure the grid
    var numRows = page.audioElements.filter(function (a) {
        return (a.type !== "outside-reference");
    }).length;
    var numColumns = page.interfaces[0].scales.length;
    sliderGrid.style.gridTemplateRows = "50px repeat(" + numRows + ", 72px)";
    scaleTextHolder.style.gridTemplateColumns = "100px repeat(" + numColumns + ", 1fr) 100px";
    page.interfaces[0].scales.sort(function (a, b) {
        if (a.position > b.position) {
            return 1;
        } else if (a.position < b.position) {
            return -1;
        }
        return 0;
    }).forEach(function (a, i) {
        var h = document.createElement("div");
        var text = document.createElement("span");
        h.className = "scale-text";
        h.style.gridColumn = String(i + 2) + "/" + String(i + 3);
        text.textContent = a.text;
        h.appendChild(text);
        scaleTextHolder.appendChild(h);
    });

    // Find all the audioElements from the audioHolder
    var index = 0;
    var labelType = page.label;
    if (labelType == "default") {
        labelType = "number";
    }
    $(page.audioElements).each(function (pageIndex, element) {
        // Find URL of track
        // In this jQuery loop, variable 'this' holds the current audioElement.

        var audioObject = audioEngineContext.newTrack(element);
        if (element.type == 'outside-reference') {
            // Construct outside reference;
            var orNode = new interfaceContext.outsideReferenceDOM(audioObject, index, document.getElementById("outside-reference-holder"));
            audioObject.bindInterface(orNode);
        } else {
            // Create a slider per track
            var label = interfaceContext.getLabel(labelType, index, page.labelStart);
            var sliderObj = new discreteObject(audioObject, label);
            sliderGrid.appendChild(sliderObj.DOMRoot);
            audioObject.bindInterface(sliderObj);
            interfaceContext.commentBoxes.createCommentBox(audioObject);
            index += 1;
        }

    });
    interfaceObj.options.forEach(function (option) {
        if (option.type == "show") {
            switch (option.name) {
                case "playhead":
                    var playbackHolder = document.getElementById('playback-holder');
                    if (playbackHolder === null) {
                        playbackHolder = document.createElement('div');
                        playbackHolder.style.width = "100%";
                        playbackHolder.align = 'center';
                        playbackHolder.appendChild(interfaceContext.playhead.object);
                        feedbackHolder.appendChild(playbackHolder);
                    }
                    break;
                case "page-count":
                    var pagecountHolder = document.getElementById('page-count');
                    if (pagecountHolder === null) {
                        pagecountHolder = document.createElement('div');
                        pagecountHolder.id = 'page-count';
                    }
                    pagecountHolder.innerHTML = '<span>Page ' + (testState.stateIndex + 1) + ' of ' + testState.stateMap.length + '</span>';
                    var inject = document.getElementById('interface-buttons');
                    inject.appendChild(pagecountHolder);
                    break;
                case "volume":
                    if (document.getElementById('master-volume-holder') === null) {
                        feedbackHolder.appendChild(interfaceContext.volume.object);
                    }
                    break;
                case "comments":
                    interfaceContext.commentBoxes.showCommentBoxes(feedbackHolder, true);
                    break;
                case "fragmentSort":
                    var button = document.getElementById('sort-fragments');
                    button.style.visibility = "visible";
                    break;
            }
        }
    });
    // Auto-align
    resizeWindow(null);
}

function discreteObject(audioObject, label) {
    // An example node, you can make this however you want for each audioElement.
    // However, every audioObject (audioEngineContext.audioObject) MUST have an interface object with the following
    // You attach them by calling audioObject.bindInterface( )
    var playing = false;

    function buttonClicked(event) {
        if (!playing) {
            audioEngineContext.play(audioObject.id);
        } else {
            audioEngineContext.stop();
        }
    }

    function radioSelected(event) {
        var time = audioEngineContext.timer.getTestTime();
        audioObject.metric.moved(time, event.currentTarget.value);
        console.log("slider " + audioObject.id + " moved to " + event.currentTarget.value + "(" + time + ")");
    }

    var root = document.createElement("div"),
        labelHolder = document.createElement("div"),
        button = document.createElement("button");
    root.className = "discrete-row";
    labelHolder.className = "discrete-label";
    button.className = "discrete-button";
    root.appendChild(labelHolder);

    var labelSpan = document.createElement("span");
    labelHolder.appendChild(labelSpan);
    labelSpan.textContent = label;
    button.textContent = "Listen";
    button.disabled = "true";
    button.addEventListener("click", this);

    var numScales = audioObject.specification.parent.interfaces[0].scales.length;
    root.style.gridTemplateColumns = "100px repeat(" + numScales + ", 1fr) 100px";
    for (var n = 0; n < numScales; n++) {
        var input = document.createElement("input");
        input.type = "radio";
        input.disabled = "true";
        input.value = n / (numScales - 1);
        input.addEventListener("click", this);
        input.name = audioObject.specification.id;
        root.appendChild(input);
    }
    root.appendChild(button);
    this.handleEvent = function (event) {
        if (event.currentTarget === button) {
            buttonClicked(event);
        } else if (event.currentTarget.type === "radio") {
            radioSelected(event);
        }
    };
    this.enable = function () {
        // This is used to tell the interface object that playback of this node is ready
        button.disabled = "";
        var a = root.querySelectorAll("input[type=\"radio\"]");
        for (var n = 0; n < a.length; n++) {
            a[n].disabled = false;
        }
        button.textContent = "Listen";
    };
    this.updateLoading = function (progress) {
        // progress is a value from 0 to 100 indicating the current download state of media files
        button.textContent = progress + "%";
    };
    this.startPlayback = function () {
        // Called when playback has begun
        playing = true;
        $(root).addClass("discrete-row-playing");
        button.textContent = "Stop";
    };
    this.stopPlayback = function () {
        // Called when playback has stopped. This gets called even if playback never started!
        playing = false;
        $(root).removeClass("discrete-row-playing");
        button.textContent = "Listen";
    };
    this.getValue = function () {
        // Return the current value of the object. If there is no value, return 0
        var a = root.querySelectorAll("input[type=\"radio\"]");
        for (var n = 0; n < a.length; n++) {
            if (a[n].checked) {
                return Number(a[n].value);
            }
        }
        return -1;
    };
    this.getPresentedId = function () {
        // Return the presented ID of the object. For instance, the APE has sliders starting from 0. Whilst AB has alphabetical scale
        return label;
    };
    this.canMove = function () {
        // Return either true or false if the interface object can be moved. AB / Reference cannot, whilst sliders can and therefore have a continuous scale.
        // These are checked primarily if the interface check option 'fragmentMoved' is enabled.
        return true;
    };
    this.exportXMLDOM = function (audioObject) {
        // Called by the audioObject holding this element to export the interface <value> node.
        // If there is no value node (such as outside reference), return null
        // If there are multiple value nodes (such as multiple scale / 2D scales), return an array of nodes with each value node having an 'interfaceName' attribute
        // Use storage.document.createElement('value'); to generate the XML node.
        var node = storage.document.createElement('value');
        node.textContent = this.getValue();
        return node;

    };
    this.error = function () {
        // If there is an error with the audioObject, this will be called to indicate a failure
    };
    Object.defineProperties(this, {
        "DOMRoot": {
            "value": root
        }
    });
}

function resizeWindow(event) {
    // Called on every window resize event, use this to scale your page properly
}

function buttonSortFragmentClick() {
    var sortIndex = interfaceContext.sortFragmentsByScore();
    var sliderBox = document.getElementById("slider-holder");
    var nodes = audioEngineContext.audioObjects.filter(function (ao) {
        return ao.specification.type !== "outside-reference";
    });
    var i;
    nodes.forEach(function (ao) {
        sliderBox.removeChild(ao.interfaceDOM.holder);
    });
    for (i = 0; i < nodes.length; i++) {
        var j = sortIndex[i];
        sliderBox.appendChild(nodes[j].interfaceDOM.holder);
    }
}

function buttonSubmitClick() // TODO: Only when all songs have been played!
{
    var checks = testState.currentStateMap.interfaces[0].options,
        canContinue = true;

    // Check that the anchor and reference objects are correctly placed
    if (interfaceContext.checkHiddenAnchor() === false) {
        return;
    }
    if (interfaceContext.checkHiddenReference() === false) {
        return;
    }
    if (interfaceContext.checkFragmentMinPlays() === false) {
        return;
    }
    if (interfaceContext.checkCommentQuestions() === false) {
        return;
    }

    for (var i = 0; i < checks.length; i++) {
        var checkState = true;
        if (checks[i].type == 'check') {
            switch (checks[i].name) {
                case 'fragmentPlayed':
                    // Check if all fragments have been played
                    checkState = interfaceContext.checkAllPlayed(checks[i].errorMessage);
                    break;
                case 'fragmentFullPlayback':
                    // Check all fragments have been played to their full length
                    checkState = interfaceContext.checkAllPlayed(checks[i].errorMessage);
                    console.log('NOTE: fragmentFullPlayback not currently implemented, performing check fragmentPlayed instead');
                    break;
                case 'fragmentMoved':
                    // Check all fragment sliders have been moved.
                    checkState = interfaceContext.checkAllMoved(checks[i].errorMessage);
                    break;
                case 'fragmentComments':
                    // Check all fragment sliders have been moved.
                    checkState = interfaceContext.checkAllCommented(checks[i].errorMessage);
                    break;
                case 'scalerange':
                    // Check the scale has been used effectively
                    checkState = interfaceContext.checkScaleRange(checks[i].errorMessage);

                    break;
                default:
                    console.log("WARNING - Check option " + checks[i].check + " is not supported on this interface");
                    break;
            }
        }
        if (checkState === false) {
            canContinue = false;
            break;
        }
    }

    if (canContinue) {
        if (audioEngineContext.status == 1) {
            var playback = document.getElementById('playback-button');
            playback.click();
            // This function is called when the submit button is clicked. Will check for any further tests to perform, or any post-test options
        } else {
            if (audioEngineContext.timer.testStarted === false) {
                interfaceContext.lightbox.post("Warning", 'You have not started the test! Please press start to begin the test!');
                return;
            }
        }
        testState.advanceState();
    }
}

function pageXMLSave(store, pageSpecification) {
    // MANDATORY
    // Saves a specific test page
    // You can use this space to add any extra nodes to your XML <audioHolder> saves
    // Get the current <page> information in store (remember to appendChild your data to it)
    // pageSpecification is the current page node configuration
    // To create new XML nodes, use storage.document.createElement();
}

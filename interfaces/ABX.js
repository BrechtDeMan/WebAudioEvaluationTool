/**
 * WAET Blank Template
 * Use this to start building your custom interface
 */

// Once this is loaded and parsed, begin execution
/* globals interfaceContext, Interface, testState, audioEngineContext, console, document, window, feedbackHolder, $, specification, storage*/
loadInterface();

function loadInterface() {
    // Use this to do any one-time page / element construction. For instance, placing any stationary text objects,
    // holding div's, or setting up any nodes which are present for the entire test sequence

    interfaceContext.insertPoint.innerHTML = ""; // Clear the current schema

    // Custom comparator Object
    interfaceContext.comparator = null;

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
    // Append the interface buttons into the interfaceButtons object.
    interfaceButtons.appendChild(playback);

    // Global parent for the comment boxes on the page
    var feedbackHolder = document.createElement('div');
    feedbackHolder.id = 'feedbackHolder';

    // Construct the AB Boxes
    var boxes = document.createElement('div');
    boxes.align = "center";
    boxes.id = "box-holders";

    var submitHolder = document.createElement("div");
    submitHolder.id = "submit-holder";
    var submit = document.createElement('button');
    submit.id = "submit";
    submit.onclick = buttonSubmitClick;
    submit.className = "big-button";
    submit.textContent = "submit";
    submitHolder.appendChild(submit);

    feedbackHolder.appendChild(boxes);

    // Create holder for comment boxes
    var comments = document.createElement("div");
    comments.id = "comment-box-holder";

    // Inject into HTML
    testContent.appendChild(title); // Insert the title
    testContent.appendChild(pagetitle);
    testContent.appendChild(interfaceButtons);
    testContent.appendChild(feedbackHolder);
    testContent.appendChild(submitHolder);
    testContent.appendChild(comments);
    interfaceContext.insertPoint.appendChild(testContent);

    // Load the full interface
    testState.initialise();
    testState.advanceState();
}

function loadTest(page) {
    // Called each time a new test page is to be build. The page specification node is the only item passed in
    document.getElementById('box-holders').innerHTML = "";

    var interfaceObj = interfaceContext.getCombinedInterfaces(page);
    if (interfaceObj.length > 1) {
        console.log("WARNING - This interface only supports one <interface> node per page. Using first interface node");
    }
    interfaceObj = interfaceObj[0];

    var commentHolder = document.getElementById("comment-box-holder");
    commentHolder.innerHTML = "";

    // Set the page title
    if (typeof page.title == "string" && page.title.length > 0) {
        document.getElementById("test-title").textContent = page.title;
    }

    if (interfaceObj.title !== null) {
        document.getElementById("pageTitle").textContent = interfaceObj.title;
    }

    if (interfaceObj.image !== undefined) {
        feedbackHolder.insertBefore(interfaceContext.imageHolder.root, document.getElementById("box-holders"));
        interfaceContext.imageHolder.setImage(interfaceObj.image);
    }

    interfaceContext.comparator = new comparator(page);

    var interfaceOptions = interfaceObj.options;
    for (var option of interfaceOptions) {
        if (option.type == "show") {
            switch (option.name) {
                case "playhead":
                    var playbackHolder = document.getElementById('playback-holder');
                    if (playbackHolder === null) {
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
                    // Generate one comment box per presented page
                    for (var element of audioEngineContext.audioObjects) {
                        interfaceContext.commentBoxes.createCommentBox(element);
                    }
                    interfaceContext.commentBoxes.showCommentBoxes(commentHolder, true);
                    break;
            }
        }
    }

    $(page.commentQuestions).each(function (index, element) {
        var node = interfaceContext.createCommentQuestion(element);
        commentHolder.appendChild(node.holder);
    });

    resizeWindow(null);
}

function comparator(page) {
    // Build prototype constructor
    this.interfaceObject = function (element, label) {
        // An example node, you can make this however you want for each audioElement.
        // However, every audioObject (audioEngineContext.audioObject) MUST have an interface object with the following
        // You attach them by calling audioObject.bindInterface( )
        this.parent = element;
        this.id = element.id;
        this.value = 0;
        this.disabled = true;
        this.box = document.createElement('div');
        this.box.className = 'comparator-holder';
        this.box.setAttribute('track-id', element.id);
        this.box.id = 'comparator-' + label;
        this.selector = document.createElement('div');
        this.selector.className = 'comparator-selector disabled';
        var selectorText = document.createElement('span');
        selectorText.textContent = label;
        this.selector.appendChild(selectorText);
        this.playback = document.createElement('button');
        this.playback.className = 'comparator-button';
        this.playback.disabled = true;
        this.playback.textContent = "Listen";
        if (element.specification.image) {
            this.selector.className += " comparator-image";
            var image = document.createElement("img");
            image.src = element.specification.image;
            image.className = "comparator-image";
            this.selector.appendChild(image);
        } else if (label === "X") {
            this.selector.classList.add('inactive');
        }
        this.box.appendChild(this.selector);
        this.box.appendChild(this.playback);
        this.selectorClicked = function (event) {
            if (label == "X" || label == "x") {
                return;
            }
            var time = audioEngineContext.timer.getTestTime();
            if (this.disabled) {
                interfaceContext.lightbox.post("Message", "Please wait until sample has loaded");
                console.log("Please wait until sample has loaded");
                return;
            }
            if (audioEngineContext.status === 0) {
                interfaceContext.lightbox.post("Message", "Please listen to the samples before making a selection");
                console.log("Please listen to the samples before making a selection");
                return;
            }
            interfaceContext.comparator.selected = this.id;
            $(".comparator-selector").removeClass('selected');
            $(this.selector).addClass('selected');
            interfaceContext.comparator.pair.forEach(function (obj) {
                obj.value = 1.0 * (obj === this);
                obj.parent.metric.moved(time, obj.value);
            }, this);
            console.log("Selected " + this.id + ' (' + time + ')');
        };
        this.playback.setAttribute("playstate", "ready");
        this.playbackClicked = function (event) {
            if (this.playback.getAttribute("playstate") == "ready") {
                audioEngineContext.play(this.id);
            } else if (event.currentTarget.getAttribute("playstate") == "playing") {
                audioEngineContext.stop();
            }

        };
        this.handleEvent = function (event) {
            if (event.currentTarget === this.playback) {
                this.playbackClicked(event);
            } else if (event.currentTarget === this.selector) {
                this.selectorClicked(event);
            }
        };
        this.playback.addEventListener("click", this);
        this.selector.addEventListener("click", this);
        this.enable = function () {
            // This is used to tell the interface object that playback of this node is ready
            if (this.parent.state == 1) {
                $(this.selector).removeClass('disabled');
                this.playback.disabled = false;
                this.disabled = false;
            }
        };
        this.updateLoading = function (progress) {
            // progress is a value from 0 to 100 indicating the current download state of media files
            if (progress != 100 && label.toLowerCase() != "x") {
                progress = String(progress);
                progress = progress.split('.')[0];
                this.playback.textContent = progress + '%';
            } else {
                this.playback.textContent = "Play";
            }
        };
        this.error = function () {
            // audioObject has an error!!
            this.playback.textContent = "Error";
            $(this.playback).addClass("error-colour");
        };
        this.startPlayback = function () {
            if (this.parent.specification.parent.playOne || specification.playOne) {
                $('.comparator-button').text('Wait');
                $('.comparator-button').attr("disabled", "true");
                $(this.playback).removeAttr("disabled");
            } else {
                $('.comparator-button').text('Listen');
            }
            $(this.playback).text('Stop');
            this.playback.setAttribute("playstate", "playing");
            interfaceContext.commentBoxes.highlightById(element.id);
        };
        this.stopPlayback = function () {
            if (this.playback.getAttribute("playstate") == "playing") {
                $(this.playback).text('Listen');
                $(this.playback).removeAttr("disabled");
                this.playback.setAttribute("playstate", "ready");
            }
            var box = interfaceContext.commentBoxes.boxes.find(function (a) {
                return a.id === element.id;
            });
            if (box) {
                box.highlight(false);
            }
        };
        this.getValue = function () {
            // Return the current value of the object. If there is no value, return 0
            return this.value;
        };
        this.getPresentedId = function () {
            // Return the presented ID of the object. For instance, the APE has sliders starting from 0. Whilst AB has alphabetical scale
            return this.selector.children[0].textContent;
        };
        this.canMove = function () {
            // Return either true or false if the interface object can be moved. AB / Reference cannot, whilst sliders can and therefore have a continuous scale.
            // These are checked primarily if the interface check option 'fragmentMoved' is enabled.
            return false;
        };
        this.exportXMLDOM = function (audioObject) {
            // Called by the audioObject holding this element to export the interface <value> node.
            // If there is no value node (such as outside reference), return null
            // If there are multiple value nodes (such as multiple scale / 2D scales), return an array of nodes with each value node having an 'interfaceName' attribute
            // Use storage.document.createElement('value'); to generate the XML node.
            var node = storage.document.createElement('value');
            node.textContent = this.value;
            return node;

        };
        this.error = function () {
            // If there is an error with the audioObject, this will be called to indicate a failure
        };
        if (label == "X" || label == "x") {
            this.enable();
        }
    };
    // Ensure there are only two comparisons per page
    if (page.audioElements.length != 2) {
        console.error('FATAL - There must be 2 <audioelement> nodes on each <page>: ' + page.id);
        return;
    }
    // Build the three audio elements

    function buildElement(index, audioObject) {
        var label;
        switch (index) {
            case 0:
                label = "A";
                break;
            case 1:
                label = "B";
                break;
            default:
                label = "X";
                break;
        }
        var node = new this.interfaceObject(audioObject, label);
        audioObject.bindInterface(node);
        return node;
    }

    this.pair = [];
    this.X = null;
    this.boxHolders = document.getElementById('box-holders');
    var node;
    page.audioElements.forEach(function (element, index) {
        if (element.type != 'normal' && element.type != "reference") {
            console.log("WARNING - ABX can only have normal or reference elements. Page " + page.id + ", Element " + element.id);
            element.type = "normal";
        }
        node = buildElement.call(this, index, audioEngineContext.newTrack(element));
        this.pair.push(node);
        this.boxHolders.appendChild(node.box);
    }, this);
    //    var elementId = Math.floor(Math.random() * 2); //Randomly pick A or B to be X
    var elementId = page.audioElements.findIndex(function (a) {
        return a.type == "reference";
    });
    if (elementId == -1) {
        elementId = Math.floor(Math.random() * 2);
        console.log("No defined 'X' given. Selecting element id " + page.audioElements[elementId].id);
    }
    var element = page.addAudioElement();
    for (var atr in page.audioElements[elementId]) {
        element[atr] = page.audioElements[elementId][atr];
    }
    element.id += "-X";
    if (typeof element.name == "string") {
        element.name += "-X";
    }

    // Create the save place-holder for the 'X' element
    var root = testState.currentStore.XMLDOM;
    var aeNode = storage.document.createElement('audioelement');
    aeNode.setAttribute('ref', element.id);
    if (typeof element.name == "string") {
        aeNode.setAttribute('name', element.name);
    }
    aeNode.setAttribute('type', 'normal');
    aeNode.setAttribute('url', element.url);
    aeNode.setAttribute('gain', element.gain);
    aeNode.appendChild(storage.document.createElement('metric'));
    root.appendChild(aeNode);
    // Build the 'X' element
    var label;
    var audioObject = audioEngineContext.newTrack(element);
    node = buildElement.call(this, 3, audioObject);
    this.X = node;
    this.boxHolders.appendChild(node.box);
}

function resizeWindow(event) {
    document.getElementById('submit').style.left = (window.innerWidth - 250) / 2 + 'px';
    var numObj = 3;
    var boxW = numObj * 312;
    var diff = window.innerWidth - boxW;
    while (diff < 0) {
        numObj = Math.ceil(numObj / 2);
        boxW = numObj * 312;
        diff = window.innerWidth - boxW;
    }
}

function buttonSubmitClick() {
    var checks = testState.currentStateMap.interfaces[0].options,
        canContinue = true;

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
                    checkState = interfaceContext.checkFragmentsFullyPlayed(checks[i].errorMessage);
                    break;
                case 'fragmentMoved':
                    // Check all fragment sliders have been moved.
                    checkState = interfaceContext.checkAllMoved(checks[i].errorMessage);
                    break;
                case 'fragmentComments':
                    // Check all fragment sliders have been moved.
                    break;
                case 'scalerange':
                    // Check the scale has been used effectively
                    console.log("WARNING - Check 'scalerange' does not make sense in AB/ABX! Ignoring!");
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
                interfaceContext.lightbox.post("Warning", 'You have not started the test! Please listen to a sample to begin the test!');
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

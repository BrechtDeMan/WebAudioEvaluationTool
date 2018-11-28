/**
 * WAET Blank Template
 * Use this to start building your custom interface
 */
/*globals interfaceContext, window, document, specification, audioEngineContext, console, testState, $, storage, sessionStorage */
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
    // Append the interface buttons into the interfaceButtons object.
    interfaceButtons.appendChild(playback);
    interfaceButtons.appendChild(submit);

    // Create outside reference holder
    var outsideRef = document.createElement("div");
    outsideRef.id = "outside-reference-holder";

    // Create a slider box
    var slider = document.createElement("div");
    slider.id = "slider";
    slider.style.height = "300px";

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
    testContent.appendChild(slider);
    testContent.appendChild(feedbackHolder);
    interfaceContext.insertPoint.appendChild(testContent);

    // Load the full interface
    testState.initialise();
    testState.advanceState();
}

function loadTest(page) {
    // Called each time a new test page is to be build. The page specification node is the only item passed in
    var id = page.id;

    var feedbackHolder = document.getElementById('feedbackHolder');
    feedbackHolder.innerHTML = "";

    var interfaceObj = interfaceContext.getCombinedInterfaces(page);
    if (interfaceObj.length > 1) {
        console.log("WARNING - This interface only supports one <interface> node per page. Using first interface node");
    }
    interfaceObj = interfaceObj[0];

    // Set the page title
    if (typeof page.title == "string" && page.title.length > 0) {
        document.getElementById("test-title").textContent = page.title;
    }

    if (interfaceObj.title !== null) {
        document.getElementById("pageTitle").textContent = interfaceObj.title;
    }

    if (interfaceObj.image !== undefined) {
        feedbackHolder.insertBefore(interfaceContext.imageHolder.root, document.getElementById("slider"));
        interfaceContext.imageHolder.setImage(interfaceObj.image);
    }
    // Delete outside reference
    document.getElementById("outside-reference-holder").innerHTML = "";

    var sliderBox = document.getElementById('slider');
    sliderBox.innerHTML = "";

    var commentBoxPrefix = "Comment on track";
    if (interfaceObj.commentBoxPrefix !== undefined) {
        commentBoxPrefix = interfaceObj.commentBoxPrefix;
    }

    $(page.commentQuestions).each(function (index, element) {
        var node = interfaceContext.createCommentQuestion(element);
        feedbackHolder.appendChild(node.holder);
    });

    var index = 0;
    var labelType = page.label;
    if (labelType == "default") {
        labelType = "number";
    }
    page.audioElements.forEach(function (element, pageIndex) {
        var audioObject = audioEngineContext.newTrack(element);
        if (element.type == 'outside-reference') {
            // Construct outside reference;
            var orNode = new interfaceContext.outsideReferenceDOM(audioObject, index, document.getElementById("outside-reference-holder"));
            audioObject.bindInterface(orNode);
        } else {
            // Create a slider per track
            var label = interfaceContext.getLabel(labelType, index, page.labelStart);
            var sliderObj = new interfaceObject(audioObject, label);

            sliderBox.appendChild(sliderObj.root);
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
            }
        }
    });
    resizeWindow();
}

function interfaceObject(audioObject, label) {
    var container = document.getElementById("slider");
    var playing = false;
    var root = document.createElement("div");
    root.className = "ordinal-element";
    root.draggable = "true";
    var labelElement = document.createElement("span");
    labelElement.className = "ordinal-element-label";
    labelElement.textContent = label;
    root.appendChild(labelElement);
    root.classList.add("disabled");
    // An example node, you can make this however you want for each audioElement.
    // However, every audioObject (audioEngineContext.audioObject) MUST have an interface object with the following
    // You attach them by calling audioObject.bindInterface( )
    root.addEventListener("click", this, true);
    root.addEventListener('dragstart', this, true);
    root.addEventListener('dragenter', this, true);
    root.addEventListener('dragover', this, true);
    root.addEventListener('dragleave', this, true);
    root.addEventListener('drop', this, true);
    root.addEventListener('dragend', this, true);
    this.handleEvent = function (event) {
        if (event.type == "click") {
            if (playing === false) {
                audioEngineContext.play(audioObject.id);
            } else {
                audioEngineContext.stop();
            }
            playing = !playing;
            return;
        } else if (event.type == "dragstart") {
            return dragStart.call(this, event);
        } else if (event.type == "dragenter") {
            return dragEnter.call(this, event);
        } else if (event.type == "dragleave") {
            return dragLeave.call(this, event);
        } else if (event.type == "dragover") {
            return dragOver.call(this, event);
        } else if (event.type == "drop") {
            return drop.call(this, event);
        } else if (event.type == "dragend") {
            return dragEnd.call(this, event);
        }
        throw (event);
    };

    function dragStart(e) {
        e.currentTarget.classList.add("dragging");

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(audioObject.id));
        sessionStorage.setItem("drag-object", String(audioObject.id));
    }

    function dragEnter(e) {
        // this / e.target is the current hover target.
        root.classList.add('over');
    }

    function dragLeave(e) {
        root.classList.remove('over'); // this / e.target is previous target element.
    }

    function dragOver(e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }

        e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.
        var srcid = e.dataTransfer.getData('text/plain');
        if (srcid === "") {
            srcid = sessionStorage.getItem("drag-object");
        }
        console.log(srcid);
        srcid = Number(srcid);
        var elements = container.childNodes;
        var srcObject = audioEngineContext.audioObjects.find(function (ao) {
            return ao.id === srcid;
        });
        var src = srcObject.interfaceDOM.root;
        if (src !== root) {
            var srcpos = srcObject.interfaceDOM.getElementPosition();
            var mypos = this.getElementPosition();
            var neighbour;
            if (srcpos <= mypos) {
                neighbour = root.nextElementSibling;
            } else {
                neighbour = root;
            }
            if (neighbour)
                container.insertBefore(src, neighbour);
            else {
                container.removeChild(src);
                container.appendChild(src);
            }

        }

        return false;
    }

    function drop(e) {
        // this / e.target is current target element.

        if (e.stopPropagation) {
            e.stopPropagation(); // stops the browser from redirecting.
        }
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }

        audioEngineContext.audioObjects.forEach(function (ao) {
            ao.interfaceDOM.processMovement();
        });

        sessionStorage.removeItem("drag-object");

        return false;
    }

    function dragEnd(e) {
        // this/e.target is the source node.
        $(".ordinal-element").removeClass("dragging");
        $(".ordinal-element").removeClass("over");
    }

    this.getElementPosition = function () {
        var elements = container.childNodes,
            position = 0,
            elem = elements[0];
        while (root !== elem) {
            position++;
            elem = elem.nextElementSibling;
        }
        return position;
    };

    this.processMovement = function () {
        var time = audioEngineContext.timer.getTestTime();
        var pos = this.getElementPosition();
        var rank = pos / (audioEngineContext.audioObjects.length - 1);
        audioObject.metric.moved(time, rank);
        console.log('slider ' + audioObject.id + ' moved to ' + rank + ' (' + time + ')');
    };

    this.enable = function () {
        // This is used to tell the interface object that playback of this node is ready
        root.classList.remove("disabled");
        labelElement.textContent = label;
    };
    this.updateLoading = function (progress) {
        // progress is a value from 0 to 100 indicating the current download state of media files
        labelElement.textContent = String(progress);
    };
    this.startPlayback = function () {
        // Called when playback has begun
        root.classList.add("playing");
        if (audioObject.commentDOM) {
            audioObject.commentDOM.trackComment.classList.add("comment-box-playing");
        }
    };
    this.stopPlayback = function () {
        // Called when playback has stopped. This gets called even if playback never started!
        root.classList.remove("playing");
        playing = false;
        if (audioObject.commentDOM) {
            audioObject.commentDOM.trackComment.classList.remove("comment-box-playing");
        }
    };
    this.getValue = function () {
        // Return the current value of the object. If there is no value, return 0
        var pos = this.getElementPosition();
        var rank = pos / (audioEngineContext.audioObjects.length - 1);
        return rank;
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
        root.classList.remove("disabled");
        labelElement.textContent = "Error";
    };
    Object.defineProperties(this, {
        "root": {
            "get": function () {
                return root;
            },
            "set": function () {}
        }
    });
}

function resizeWindow(event) {
    // Called on every window resize event, use this to scale your page properly
    var w = $("#slider").width();
    var N = audioEngineContext.audioObjects.length;
    w /= N;
    w -= 14;
    w = Math.floor(w);
    $(".ordinal-element").width(w);
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

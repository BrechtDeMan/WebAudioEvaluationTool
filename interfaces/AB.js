// Once this is loaded and parsed, begin execution
loadInterface();
/*globals window, interfaceContext, testState, Interface, audioEngineContext, console, document, specification, $, storage*/
function loadInterface() {
    // Get the dimensions of the screen available to the page
    var width = window.innerWidth;
    var height = window.innerHeight;
    interfaceContext.insertPoint.innerHTML = ""; // Clear the current schema

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

    // Create outside reference holder
    var outsideRef = document.createElement("div");
    outsideRef.id = "outside-reference-holder";

    // Construct the AB Boxes
    var boxes = document.createElement('div');
    boxes.id = "box-holders";

    var submitHolder = document.createElement("div");
    submitHolder.id = "submit-holder";
    var submit = document.createElement('button');
    submit.id = "submit";
    submit.onclick = buttonSubmitClick;
    submit.className = "big-button";
    submit.textContent = "Submit";
    submitHolder.appendChild(submit);

    feedbackHolder.appendChild(boxes);

    // Create holder for comment boxes
    var comments = document.createElement("div");
    comments.id = "comment-box-holder";

    // Inject into HTML
    testContent.appendChild(title); // Insert the title
    testContent.appendChild(pagetitle);
    testContent.appendChild(interfaceButtons);
    testContent.appendChild(outsideRef);
    testContent.appendChild(feedbackHolder);
    testContent.appendChild(submitHolder);
    testContent.appendChild(comments);
    interfaceContext.insertPoint.appendChild(testContent);

    // Load the full interface
    testState.initialise();
    testState.advanceState();
}

function loadTest(audioHolderObject) {
    var feedbackHolder = document.getElementById('feedbackHolder');
    var interfaceObj = interfaceContext.getCombinedInterfaces(audioHolderObject);
    if (interfaceObj.length > 1) {
        console.log("WARNING - This interface only supports one <interface> node per page. Using first interface node");
    }
    interfaceObj = interfaceObj[0];

    var commentHolder = document.getElementById('comment-box-holder');
    commentHolder.innerHTML = "";

    // Delete outside reference
    var outsideReferenceHolder = document.getElementById("outside-reference-holder");
    outsideReferenceHolder.innerHTML = "";

    // Set the page title
    if (typeof audioHolderObject.title == "string" && audioHolderObject.title.length > 0) {
        document.getElementById("test-title").textContent = audioHolderObject.title;
    }

    if (interfaceObj.title !== undefined) {
        document.getElementById("pageTitle").textContent = interfaceObj.title;
    }

    if (interfaceObj.image !== undefined) {
        feedbackHolder.insertBefore(interfaceContext.imageHolder.root, document.getElementById("box-holders"));
        interfaceContext.imageHolder.setImage(interfaceObj.image);
    }

    var interfaceOptions = interfaceObj.options;
    // Clear the interfaceElements
    {
        var node = document.getElementById('playback-holder');
        if (node) {
            feedbackHolder.removeChild(node);
        }
        node = document.getElementById('page-count');
        if (node) {
            document.getElementById('interface-buttons').removeChild(node);
        }
        node = document.getElementById('master-volume-holder-float');
        if (node) {
            feedbackHolder.removeChild(node);
        }
    }

    // Populate the comparator object
    interfaceContext.comparator = new comparator(audioHolderObject);

    for (var option of interfaceOptions) {
        if (option.type == "show") {
            switch (option.name) {
                case "playhead":
                    var playbackHolder = document.getElementById('playback-holder');
                    if (playbackHolder === null) {
                        playbackHolder = document.createElement('div');
                        playbackHolder.id = 'playback-holder';
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
                        document.getElementById('interface-buttons').appendChild(pagecountHolder);
                    }
                    pagecountHolder.innerHTML = '<span>Page ' + (testState.stateIndex + 1) + ' of ' + testState.stateMap.length + '</span>';
                    break;
                case "volume":
                    if (document.getElementById('master-volume-holder-float') === null) {
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

    $(audioHolderObject.commentQuestions).each(function (index, element) {
        var node = interfaceContext.createCommentQuestion(element);
        commentHolder.appendChild(node.holder);
    });

    resizeWindow(null);
}

function comparator(audioHolderObject) {
    this.comparatorBox = function (audioElement, id, text) {
        this.parent = audioElement;
        this.id = id;
        this.value = 0;
        this.disabled = true;
        this.box = document.createElement('div');
        this.box.className = 'comparator-holder';
        this.box.setAttribute('track-id', audioElement.id);
        this.box.id = 'comparator-' + text;
        this.selector = document.createElement('div');
        this.selector.className = 'comparator-selector disabled';
        if (audioElement.specification.image) {
            this.selector.className += " comparator-image";
            var image = document.createElement("img");
            image.src = audioElement.specification.image;
            image.className = "comparator-image";
            this.selector.appendChild(image);
        }
        var selectorText = document.createElement('span');
        selectorText.textContent = text;
        this.selector.appendChild(selectorText);
        this.playback = document.createElement('button');
        this.playback.className = 'comparator-button';
        this.playback.disabled = true;
        this.playback.textContent = "Listen";
        this.box.appendChild(this.selector);
        this.box.appendChild(this.playback);
        this.selectorClicked = function () {
            var i;
            var time = audioEngineContext.timer.getTestTime();
            if (this.parent.state !== 1) {
                interfaceContext.lightbox.post("Message", "Please wait for the sample to load");
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
            this.comparator.comparators.forEach(function (a) {
                if (a !== this) {
                    a.value = 0;
                } else {
                    a.value = 1;
                }
                a.parent.metric.moved(time, a.value);
            }, this);
            console.log("Selected " + this.id + ' (' + time + ')');
        };
        this.playback.setAttribute("playstate", "ready");
        this.playbackClicked = function () {
            if (this.playback.getAttribute("playstate") == "ready") {
                audioEngineContext.play(this.id);
            } else if (this.playback.getAttribute("playstate") == "playing") {
                audioEngineContext.stop();
            }

        };
        this.handleEvent = function (event) {
            if (event.currentTarget === this.selector) {
                this.selectorClicked();
            } else if (event.currentTarget === this.playback) {
                this.playbackClicked();
            }
        };
        this.playback.addEventListener("click", this);
        this.selector.addEventListener("click", this);

        this.enable = function () {
            if (this.parent.state == 1) {
                $(this.selector).removeClass('disabled');
                this.playback.disabled = false;
            }
        };
        this.updateLoading = function (progress) {
            if (progress != 100) {
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
            interfaceContext.commentBoxes.highlightById(audioElement.id);
        };
        this.stopPlayback = function () {
            if (this.playback.getAttribute("playstate") == "playing") {
                $(this.playback).text('Listen');
                $(this.playback).removeAttr("disabled");
                this.playback.setAttribute("playstate", "ready");
                if (this.parent.specification.parent.playOne || specification.playOne) {
                    $('.comparator-button').text('Listen');
                    $('.comparator-button').removeAttr("disabled");
                }
            }
            var box = interfaceContext.commentBoxes.boxes.find(function (a) {
                return a.id === audioElement.id;
            });
            if (box) {
                box.highlight(false);
            }
        };
        this.exportXMLDOM = function (audioObject) {
            var node = storage.document.createElement('value');
            node.textContent = this.value;
            var iname = testState.getCurrentTestPage().interfaces[0].name;
            if (typeof iname == "string") {
                node.setAttribute("interface-name", iname);
            }
            return node;
        };
        this.getValue = function () {
            return this.value;
        };
        this.getPresentedId = function () {
            return this.selector.children[0].textContent;
        };
        this.canMove = function () {
            return false;
        };
    };

    this.boxHolders = document.getElementById('box-holders');
    this.boxHolders.innerHTML = "";
    this.comparators = [];
    this.selected = null;

    var labelType = audioHolderObject.label;
    if (labelType == "default") {
        labelType = "capital";
    }

    // First generate the Audio Objects for the Audio Engine
    for (var index = 0; index < audioHolderObject.audioElements.length; index++) {
        var element = audioHolderObject.audioElements[index];
        var audioObject = audioEngineContext.newTrack(element);
        if (index == audioHolderObject.outsideReference || element.type == 'outside-reference') {
            var orNode = new interfaceContext.outsideReferenceDOM(audioObject, index, document.getElementById("outside-reference-holder"));
            audioObject.bindInterface(orNode);
        } else {
            var label = element.label;
            if (label === "") {
                label = interfaceContext.getLabel(labelType, index, audioHolderObject.labelStart);
            }
            var node = new this.comparatorBox(audioObject, index, label);
            Object.defineProperties(node, {
                'comparator': {
                    'value': this
                }
            });
            audioObject.bindInterface(node);
            this.comparators.push(node);
            this.boxHolders.appendChild(node.box);
        }
    }
    return this;
}

function resizeWindow(event) {
    document.getElementById('submit').style.left = (window.innerWidth - 250) / 2 + 'px';
    var numObj = interfaceContext.comparator.comparators.length;
    var boxW = numObj * 312;
    var diff = window.innerWidth - boxW;
    while (diff < 0) {
        numObj = Math.ceil(numObj / 2);
        boxW = numObj * 312;
        diff = window.innerWidth - boxW;
    }

    var outsideRef = document.getElementById('outside-reference');
    if (outsideRef !== null) {
        outsideRef.style.left = (window.innerWidth - 120) / 2 + 'px';
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
        if (checks[i].type == 'check') {
            var checkState;
            switch (checks[i].name) {
                case 'fragmentPlayed':
                    // Check if all fragments have been played
                    checkState = interfaceContext.checkAllPlayed(checks[i].errorMessage);
                    if (checkState === false) {
                        canContinue = false;
                    }
                    break;
                case 'fragmentFullPlayback':
                    // Check all fragments have been played to their full length
                    checkState = interfaceContext.checkFragmentsFullyPlayed(checks[i].errorMessage);
                    if (checkState === false) {
                        canContinue = false;
                    }
                    break;
                case 'fragmentMoved':
                    // Check all fragment sliders have been moved.
                    checkState = interfaceContext.checkAllMoved(checks[i].errorMessage);
                    if (checkState === false) {
                        canContinue = false;
                    }
                    break;
                case 'fragmentComments':
                    // Check all fragment sliders have been moved.
                    checkState = interfaceContext.checkAllCommented(checks[i].errorMessage);
                    if (checkState === false) {
                        canContinue = false;
                    }
                    break;
                case 'scalerange':
                    // Check the scale has been used effectively
                    checkState = interfaceContext.checkScaleRange(checks[i].errorMessage);
                    if (checkState === false) {
                        canContinue = false;
                    }
                    break;
                default:
                    console.log("WARNING - Check option " + checks[i].check + " is not supported on this interface");
                    break;
            }

        }
        if (!canContinue) {
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
                interfaceContext.lightbox.post("Warning", 'You have not started the test! Please click play on a sample to begin the test!');
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

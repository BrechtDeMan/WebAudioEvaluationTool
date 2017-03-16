// Once this is loaded and parsed, begin execution
loadInterface();

function loadInterface() {
    // Get the dimensions of the screen available to the page
    var width = window.innerWidth;
    var height = window.innerHeight;
    interfaceContext.insertPoint.innerHTML = ""; // Clear the current schema

    // Custom comparator Object
    Interface.prototype.comparator = null;

    Interface.prototype.checkScaleRange = function (min, max) {
        var page = testState.getCurrentTestPage();
        var audioObjects = audioEngineContext.audioObjects;
        var state = true;
        var str = "Please keep listening. ";
        var minRanking = Infinity;
        var maxRanking = -Infinity;
        for (var ao of audioObjects) {
            var rank = ao.interfaceDOM.getValue();
            if (rank < minRanking) {
                minRanking = rank;
            }
            if (rank > maxRanking) {
                maxRanking = rank;
            }
        }
        if (maxRanking * 100 < max) {
            str += "At least one fragment must be selected."
            state = false;
        }
        if (!state) {
            console.log(str);
            this.storeErrorNode(str);
            interfaceContext.lightbox.post("Message", str);
        }
        return state;
    }

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
    if (titleAttr != undefined) {
        titleSpan.textContent = titleAttr;
    } else {
        titleSpan.textContent = 'Listening test';
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
    boxes.align = "center";
    boxes.id = "box-holders";
    boxes.style.float = "left";

    var submit = document.createElement('button');
    submit.id = "submit";
    submit.onclick = buttonSubmitClick;
    submit.className = "big-button";
    submit.textContent = "submit";
    submit.style.position = "relative";
    submit.style.left = (window.innerWidth - 250) / 2 + 'px';

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
    testContent.appendChild(submit);
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
        document.getElementById("test-title").textContent = audioHolderObject.title
    }

    if (interfaceObj.title != null) {
        document.getElementById("pageTitle").textContent = interfaceObj.title;
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
                    if (playbackHolder == null) {
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
                    if (pagecountHolder == null) {
                        pagecountHolder = document.createElement('div');
                        pagecountHolder.id = 'page-count';
                        document.getElementById('interface-buttons').appendChild(pagecountHolder);
                    }
                    pagecountHolder.innerHTML = '<span>Page ' + (testState.stateIndex + 1) + ' of ' + testState.stateMap.length + '</span>';
                    break;
                case "volume":
                    if (document.getElementById('master-volume-holder-float') == null) {
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
        var selectorText = document.createElement('span');
        selectorText.textContent = text;
        this.selector.appendChild(selectorText);
        this.playback = document.createElement('button');
        this.playback.className = 'comparator-button';
        this.playback.disabled = true;
        this.playback.textContent = "Listen";
        this.box.appendChild(this.selector);
        this.box.appendChild(this.playback);
        this.selector.onclick = function (event) {
            var time = audioEngineContext.timer.getTestTime();
            if ($(event.currentTarget).hasClass('disabled')) {
                console.log("Please wait until sample has loaded");
                return;
            }
            if (audioEngineContext.status == 0) {
                interfaceContext.lightbox.post("Message", "Please listen to the samples before making a selection");
                console.log("Please listen to the samples before making a selection");
                return;
            }
            var id = event.currentTarget.parentElement.getAttribute('track-id');
            interfaceContext.comparator.selected = id;
            if ($(event.currentTarget).hasClass("selected")) {
                $(".comparator-selector").removeClass('selected');
                for (var i = 0; i < interfaceContext.comparator.comparators.length; i++) {
                    var obj = interfaceContext.comparator.comparators[i];
                    obj.parent.metric.moved(time, 0);
                    obj.value = 0;
                }
            } else {
                $(".comparator-selector").removeClass('selected');
                $(event.currentTarget).addClass('selected');
                for (var i = 0; i < interfaceContext.comparator.comparators.length; i++) {
                    var obj = interfaceContext.comparator.comparators[i];
                    if (i == id) {
                        obj.value = 1;
                    } else {
                        obj.value = 0;
                    }
                    obj.parent.metric.moved(time, obj.value);
                }
                console.log("Selected " + id + ' (' + time + ')');
            }
        };
        this.playback.setAttribute("playstate", "ready");
        this.playback.onclick = function (event) {
            var id = event.currentTarget.parentElement.getAttribute('track-id');
            if (event.currentTarget.getAttribute("playstate") == "ready") {
                audioEngineContext.play(id);
            } else if (event.currentTarget.getAttribute("playstate") == "playing") {
                audioEngineContext.stop();
            }

        };

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
        }
        this.startPlayback = function () {
            if (this.parent.specification.parent.playOne || specification.playOne) {
                $('.comparator-button').text('Wait');
                $('.comparator-button').attr("disabled", "true");
                $(this.playback).css("disabled", "false");
            } else {
                $('.comparator-button').text('Listen');
            }
            $(this.playback).text('Stop');
            this.playback.setAttribute("playstate", "playing");
        };
        this.stopPlayback = function () {
            if (this.playback.getAttribute("playstate") == "playing") {
                $('.comparator-button').text('Listen');
                $('.comparator-button').removeAttr("disabled");
                this.playback.setAttribute("playstate", "ready");
            }
        };
        this.exportXMLDOM = function (audioObject) {
            var node = storage.document.createElement('value');
            node.textContent = this.value;
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
    document.getElementById('box-holders').style.marginLeft = diff / 2 + 'px';
    document.getElementById('box-holders').style.marginRight = diff / 2 + 'px';
    document.getElementById('box-holders').style.width = boxW + 'px';

    var outsideRef = document.getElementById('outside-reference');
    if (outsideRef != null) {
        outsideRef.style.left = (window.innerWidth - 120) / 2 + 'px';
    }
}

function buttonSubmitClick() {
    var checks = testState.currentStateMap.interfaces[0].options,
        canContinue = true;

    for (var i = 0; i < checks.length; i++) {
        if (checks[i].type == 'check') {
            switch (checks[i].name) {
                case 'fragmentPlayed':
                    // Check if all fragments have been played
                    var checkState = interfaceContext.checkAllPlayed();
                    if (checkState == false) {
                        canContinue = false;
                    }
                    break;
                case 'fragmentFullPlayback':
                    // Check all fragments have been played to their full length
                    var checkState = interfaceContext.checkFragmentsFullyPlayed();
                    if (checkState == false) {
                        canContinue = false;
                    }
                    break;
                case 'fragmentMoved':
                    // Check all fragment sliders have been moved.
                    var checkState = interfaceContext.checkAllMoved();
                    if (checkState == false) {
                        canContinue = false;
                    }
                    break;
                case 'fragmentComments':
                    // Check all fragment sliders have been moved.
                    var checkState = interfaceContext.checkAllCommented();
                    if (checkState == false) {
                        canContinue = false;
                    }
                    break;
                case 'scalerange':
                    // Check the scale has been used effectively
                    var checkState = interfaceContext.checkScaleRange(checks[i].min, checks[i].max);
                    if (checkState == false) {
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
            if (audioEngineContext.timer.testStarted == false) {
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

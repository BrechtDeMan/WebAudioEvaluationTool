/**
 *  mushra.js
 *  Create the MUSHRA interface
 */
/*globals window, interfaceContext, document, $, specification, audioEngineContext, console, testState, storage */
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
    playback.style.display = 'inline-block';
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
    submit.style.display = 'inline-block';

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


    // Create a slider box
    var sliderBox = document.createElement('div');
    sliderBox.style.width = "100%";
    sliderBox.style.height = window.innerHeight - 200 + 12 + 'px';
    sliderBox.style.marginBottom = '10px';
    sliderBox.id = 'slider';
    var scaleHolder = document.createElement('div');
    scaleHolder.id = "scale-holder";
    sliderBox.appendChild(scaleHolder);
    var scaleText = document.createElement('div');
    scaleText.id = "scale-text-holder";
    scaleHolder.appendChild(scaleText);
    var scaleCanvas = document.createElement('canvas');
    scaleCanvas.id = "scale-canvas";
    scaleHolder.appendChild(scaleCanvas);
    var sliderObjectHolder = document.createElement('div');
    sliderObjectHolder.id = 'slider-holder';
    sliderObjectHolder.align = "center";
    sliderBox.appendChild(sliderObjectHolder);

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

function loadTest(audioHolderObject) {
    var id = audioHolderObject.id;

    var feedbackHolder = document.getElementById('feedbackHolder');
    feedbackHolder.innerHTML = "";
    var interfaceObj = interfaceContext.getCombinedInterfaces(audioHolderObject);
    if (interfaceObj.length > 1) {
        console.log("WARNING - This interface only supports one <interface> node per page. Using first interface node");
    }
    interfaceObj = interfaceObj[0];

    // Set the page title
    if (typeof audioHolderObject.title == "string" && audioHolderObject.title.length > 0) {
        document.getElementById("test-title").textContent = audioHolderObject.title;
    }

    if (interfaceObj.title !== null) {
        document.getElementById("pageTitle").textContent = interfaceObj.title;
    }

    if (interfaceObj.image !== undefined || audioHolderObject.audioElements.some(function (elem) {
            return elem.image !== undefined;
        })) {
        document.getElementById("testContent").insertBefore(interfaceContext.imageHolder.root, document.getElementById("slider"));
        interfaceContext.imageHolder.setImage(interfaceObj.image);
    }

    // Delete outside reference
    var outsideReferenceHolder = document.getElementById("outside-reference-holder");
    outsideReferenceHolder.innerHTML = "";

    var sliderBox = document.getElementById('slider-holder');
    sliderBox.innerHTML = "";

    var commentBoxPrefix = "Comment on track";
    if (interfaceObj.commentBoxPrefix !== undefined) {
        commentBoxPrefix = interfaceObj.commentBoxPrefix;
    }
    var loopPlayback = audioHolderObject.loop;

    var currentTestHolder = document.createElement('audioHolder');
    currentTestHolder.id = audioHolderObject.id;
    currentTestHolder.repeatCount = audioHolderObject.repeatCount;

    // Find all the audioElements from the audioHolder
    var index = 0;
    var interfaceScales = testState.currentStateMap.interfaces[0].scales;
    var labelType = audioHolderObject.label;
    if (labelType == "default") {
        labelType = "number";
    }
    $(audioHolderObject.audioElements).each(function (pageIndex, element) {
        // Find URL of track
        // In this jQuery loop, variable 'this' holds the current audioElement.

        var audioObject = audioEngineContext.newTrack(element);
        if (element.type == 'outside-reference') {
            // Construct outside reference;
            var orNode = new interfaceContext.outsideReferenceDOM(audioObject, index, outsideReferenceHolder);
            audioObject.bindInterface(orNode);
        } else {
            // Create a slider per track
            var label = element.label || interfaceContext.getLabel(labelType, index, audioHolderObject.labelStart);
            var sliderObj = new sliderObject(audioObject, label);

            if (typeof audioHolderObject.initialPosition === "number") {
                // Set the values
                sliderObj.slider.value = audioHolderObject.initalPosition;
            } else {
                // Distribute it randomnly
                sliderObj.slider.value = Math.random();
            }
            sliderBox.appendChild(sliderObj.holder);
            audioObject.bindInterface(sliderObj);
            interfaceContext.commentBoxes.createCommentBox(audioObject);
            index += 1;
        }

    });

    if (testState.currentStateMap.restrictMovement) {
        $(".track-slider-range").addClass("track-slider-range-disabled");
        $(".track-slider-range").each(function (i, e) {
            e.disabled = true;
        });
    }


    var interfaceOptions = interfaceObj.options;
    var sortButton = document.getElementById("sort-fragments");
    sortButton.style.visibility = "hidden";
    interfaceOptions.forEach(function (option) {
        if (option.type == "show") {
            switch (option.name) {
                case "playhead":
                    var playbackHolder = document.getElementById('playback-holder');
                    if (playbackHolder === null) {
                        playbackHolder = document.createElement('div');
                        playbackHolder.style.width = "100%";
                        playbackHolder.align = 'center';
                        playbackHolder.appendChild(interfaceContext.playhead.object);
                        feedbackHolder.insertBefore(playbackHolder, feedbackHolder.firstElementChild);
                    }
                    break;
                case "page-count":
                    var pagecountHolder = document.getElementById('page-count');
                    if (pagecountHolder === null) {
                        pagecountHolder = document.createElement('div');
                        pagecountHolder.id = 'page-count';
                        pagecountHolder.style.display = 'inline-block';
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

    $(audioHolderObject.commentQuestions).each(function (index, element) {
        var node = interfaceContext.createCommentQuestion(element);
        feedbackHolder.appendChild(node.holder);
    });

    // Auto-align
    resizeWindow(null);
}

function sliderObject(audioObject, label) {
    // Constructs the slider object. We use the HTML5 slider object
    var page = testState.currentStateMap;
    this.parent = audioObject;
    this.holder = document.createElement('div');
    this.title = document.createElement('span');
    this.slider = document.createElement('input');
    this.play = document.createElement('button');

    this.holder.className = 'track-slider';
    this.holder.style.height = window.innerHeight - 200 + 'px';
    this.holder.appendChild(this.title);
    this.holder.appendChild(this.slider);
    this.holder.appendChild(this.play);
    this.holder.align = "center";
    if (label === 0) {
        this.holder.style.marginLeft = '0px';
    }
    this.holder.setAttribute('trackIndex', audioObject.id);

    this.title.textContent = label;
    this.title.style.width = "100%";
    this.title.style.float = "left";

    this.slider.type = "range";
    this.slider.className = "track-slider-range track-slider-not-moved";
    this.slider.min = "0";
    this.slider.max = "1";
    this.slider.step = "0.01";
    this.slider.setAttribute('orient', 'vertical');
    this.slider.style.height = window.innerHeight - 250 + 'px';
    this.slider.onchange = function () {
        var time = audioEngineContext.timer.getTestTime();
        var id = Number(this.parentNode.getAttribute('trackIndex'));
        audioEngineContext.audioObjects[id].metric.moved(time, this.value);
        console.log('slider ' + id + ' moved to ' + this.value + ' (' + time + ')');
        $(this).removeClass('track-slider-not-moved');
    };

    this.play.textContent = "Loading...";
    this.play.value = audioObject.id;
    this.play.style.float = "left";
    this.play.style.width = "100%";
    this.play.disabled = true;
    this.play.setAttribute("playstate", "ready");
    this.play.onclick = function (event) {
        var id = Number(event.currentTarget.value);
        //audioEngineContext.metric.sliderPlayed(id);
        if (event.currentTarget.getAttribute("playstate") == "ready") {
            audioEngineContext.play(id);
        } else if (event.currentTarget.getAttribute("playstate") == "playing") {
            audioEngineContext.stop();
        }
    };

    this.enable = function () {
        this.play.disabled = false;
        this.play.textContent = "Play";
        $(this.slider).removeClass('track-slider-disabled');
    };

    this.exportXMLDOM = function (audioObject) {
        // Called by the audioObject holding this element. Must be present
        var node = storage.document.createElement('value');
        node.textContent = this.slider.value;
        var iname = testState.getCurrentTestPage().interfaces[0].name;
        if (typeof iname == "string") {
            node.setAttribute("interface-name", iname);
        }
        return node;
    };
    this.startPlayback = function () {
        var self = this;
        // Called when playback has begun
        this.play.setAttribute("playstate", "playing");
        $(".track-slider").removeClass('track-slider-playing');
        $(this.holder).addClass('track-slider-playing');
        interfaceContext.commentBoxes.highlightById(audioObject.id);
        var outsideReference = document.getElementById('outside-reference');
        if (outsideReference !== null) {
            $(outsideReference).removeClass('track-slider-playing');
        }
        this.play.textContent = "Stop";
        if (page.restrictMovement) {
            if (page.loop) {
                $(this.slider).removeClass("track-slider-range-disabled");
                this.slider.removeAttribute("disabled");
            } else {
                $(".track-slider-range").addClass("track-slider-range-disabled");
                $(this.slider).removeClass("track-slider-range-disabled");
                $(".track-slider-range").each(function (i, m) {
                    if (m == self.slider) {
                        m.removeAttribute("disabled");
                    } else {
                        m.setAttribute("disabled", "true");
                    }
                });
            }
        }
        if (audioObject.specification.image !== undefined) {
            interfaceContext.imageHolder.setImage(audioObject.specification.image);
        }
    };
    this.stopPlayback = function () {
        // Called when playback has stopped. This gets called even if playback never started!
        this.play.setAttribute("playstate", "ready");
        $(this.holder).removeClass('track-slider-playing');
        this.play.textContent = "Play";
        if (page.restrictMovement && page.loop) {
            $(this.slider).addClass("track-slider-range-disabled");
            this.slider.setAttribute("disabled", "true");
        }
        var box = interfaceContext.commentBoxes.boxes.find(function (a) {
            return a.id === audioObject.id;
        });
        if (box) {
            box.highlight(false);
        }
        if (audioObject.specification.parent.interfaces[0].image !== undefined) {
            interfaceContext.imageHolder.setImage(audioObject.specification.parent.interfaces[0].image);
        } else {
            interfaceContext.imageHolder.setImage("");
        }
    };
    this.getValue = function () {
        return this.slider.value;
    };

    this.resize = function (event, height) {
        this.holder.style.height = height - 20 + 'px';
        this.slider.style.height = height - 70 + 'px';
    };
    this.updateLoading = function (progress) {
        progress = String(progress);
        progress = progress.substr(0, 5);
        this.play.textContent = "Loading: " + progress + "%";
    };

    if (this.parent.state == 1) {
        this.enable();
    }
    this.getPresentedId = function () {
        return this.title.textContent;
    };
    this.canMove = function () {
        return true;
    };
    this.error = function () {
        // audioObject has an error!!
        this.playback.textContent = "Error";
        $(this.playback).addClass("error-colour");
    };
}

function resizeWindow(event) {
    // Function called when the window has been resized.
    // MANDATORY FUNCTION

    var outsideRef = document.getElementById('outside-reference'),
        imageHeight = 0,
        minHeight = Math.max(Math.floor(window.screen.height * 0.33), 200),
        maxHeight = Math.floor(window.screen.height * 0.5);
    if (document.getElementById("imageController")) {
        imageHeight = $(interfaceContext.imageHolder.root).height();
    }
    if (outsideRef !== null) {
        outsideRef.style.left = (window.innerWidth - 120) / 2 + 'px';
    }

    // Auto-align
    var numObj = document.getElementsByClassName('track-slider').length;
    var totalWidth = (numObj - 1) * 150 + 100;
    var diff = (window.innerWidth - totalWidth) / 2;
    var height = window.innerHeight - 180 - imageHeight;
    height = Math.min(height, maxHeight);
    height = Math.max(height, minHeight);
    document.getElementById('slider').style.height = height + 'px';
    if (diff <= 0) {
        diff = 0;
    }
    document.getElementById('slider-holder').style.marginLeft = diff + 'px';
    for (var i in audioEngineContext.audioObjects) {
        if (audioEngineContext.audioObjects[i].specification.type != 'outside-reference') {
            audioEngineContext.audioObjects[i].interfaceDOM.resize(event, height);
        }
    }
    document.getElementById('scale-holder').style.marginLeft = (diff - 100) + 'px';
    document.getElementById('scale-text-holder').style.height = height - 14 + 'px';
    // Cheers edge for making me delete a canvas every resize.
    var canvas = document.getElementById('scale-canvas');
    var new_canvas = document.createElement("canvas");
    new_canvas.id = 'scale-canvas';
    canvas.parentElement.appendChild(new_canvas);
    canvas.parentElement.removeChild(canvas);
    new_canvas.width = totalWidth;
    new_canvas.height = height - 14;
    drawScale();
}

function drawScale() {
    var interfaceObj = testState.currentStateMap.interfaces[0];
    var scales = testState.currentStateMap.interfaces[0].scales;
    var ticks = specification.interfaces.options.concat(interfaceObj.options).find(function (a) {
        return (a.type == "show" && a.name == "ticks");
    });
    if (ticks !== undefined) {
        ticks = true;
    } else {
        ticks = false;
    }
    scales = scales.sort(function (a, b) {
        return a.position - b.position;
    });
    var canvas = document.getElementById('scale-canvas');
    var ctx = canvas.getContext("2d");
    var height = canvas.height;
    var width = canvas.width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var draw_heights = [24, height - 34];
    var textHolder = document.getElementById('scale-text-holder');
    textHolder.innerHTML = "";
    var lastHeight = 0;
    scales.forEach(function (scale) {
        var posPercent = scale.position / 100.0;
        var posPix = (1 - posPercent) * (draw_heights[1] - draw_heights[0]) + draw_heights[0];
        if (ticks) {
            ctx.fillStyle = "#000000";
            ctx.setLineDash([1, 2]);
            ctx.moveTo(0, posPix);
            ctx.lineTo(width, posPix);
            ctx.stroke();
        }
        var text = document.createElement('div');
        text.align = "right";
        var textC = document.createElement('span');
        textC.textContent = scale.text;
        text.appendChild(textC);
        text.className = "scale-text";
        textHolder.appendChild(text);
        text.style.top = (posPix - 9) + 'px';
        lastHeight = posPix;
    });
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
                interfaceContext.lightbox.post("Message", 'You have not started the test! Please press start to begin the test!');
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

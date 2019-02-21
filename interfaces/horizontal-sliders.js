// Once this is loaded and parsed, begin execution
/*globals interfaceContext, window, document, specification, audioEngineContext, console, testState, $, storage */
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

    // Create a slider box
    var sliderBox = document.createElement('div');
    sliderBox.style.width = "100%";
    sliderBox.style.height = window.innerHeight - 200 + 12 + 'px';
    sliderBox.style.marginBottom = '10px';
    sliderBox.id = 'slider';
    var scaleHolder = document.createElement('div');
    scaleHolder.id = "scale-holder";
    scaleHolder.style.marginLeft = "107px";
    sliderBox.appendChild(scaleHolder);
    var scaleText = document.createElement('div');
    scaleText.id = "scale-text-holder";
    scaleText.style.height = "25px";
    scaleText.style.width = "100%";
    scaleHolder.appendChild(scaleText);
    var scaleCanvas = document.createElement('canvas');
    scaleCanvas.id = "scale-canvas";
    scaleCanvas.style.marginLeft = "100px";
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

    if (interfaceObj.image !== undefined || page.audioElements.some(function (elem) {
            return elem.image !== undefined;
        })) {
        document.getElementById("testContent").insertBefore(interfaceContext.imageHolder.root, document.getElementById("slider"));
        interfaceContext.imageHolder.setImage(interfaceObj.image);
    }

    // Delete outside reference
    document.getElementById("outside-reference-holder").innerHTML = "";

    var sliderBox = document.getElementById('slider-holder');
    sliderBox.innerHTML = "";

    var commentBoxPrefix = "Comment on track";
    if (interfaceObj.commentBoxPrefix !== undefined) {
        commentBoxPrefix = interfaceObj.commentBoxPrefix;
    }
    var loopPlayback = page.loop;

    $(page.commentQuestions).each(function (index, element) {
        var node = interfaceContext.createCommentQuestion(element);
        feedbackHolder.appendChild(node.holder);
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
            var sliderObj = new sliderObject(audioObject, label);

            if (typeof page.initialPosition === "number") {
                // Set the values
                sliderObj.slider.value = page.initalPosition;
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

function sliderObject(audioObject, label) {
    // An example node, you can make this however you want for each audioElement.
    // However, every audioObject (audioEngineContext.audioObject) MUST have an interface object with the following
    // You attach them by calling audioObject.bindInterface( )
    var playing = false;
    this.parent = audioObject;

    this.holder = document.createElement('div');
    this.title = document.createElement('div');
    this.titleH4 = document.createElement('h4');
    this.slider = document.createElement('input');
    this.play = document.createElement('button');

    this.holder.className = 'track-slider';
    this.holder.style.width = window.innerWidth - 200 + 'px';
    this.title.appendChild(this.titleH4);
    this.holder.appendChild(this.title);
    this.holder.appendChild(this.slider);
    this.holder.appendChild(this.play);
    this.holder.setAttribute('trackIndex', audioObject.id);
    this.titleH4.textContent = label;
    this.title.className = 'track-slider-title';

    this.slider.type = "range";
    this.slider.className = "track-slider-range track-slider-not-moved";
    this.slider.min = "0";
    this.slider.max = "1";
    this.slider.step = "0.01";
    this.slider.onchange = function () {
        var time = audioEngineContext.timer.getTestTime();
        var id = Number(this.parentNode.getAttribute('trackIndex'));
        audioEngineContext.audioObjects[id].metric.moved(time, this.value);
        console.log('slider ' + id + ' moved to ' + this.value + ' (' + time + ')');
        $(this).removeClass('track-slider-not-moved');
    };

    this.play.className = 'track-slider-button';
    this.play.textContent = "Loading...";
    this.play.value = audioObject.id;
    this.play.disabled = true;
    this.play.setAttribute("playstate", "ready");
    this.play.onclick = function (event) {
        var id = Number(event.currentTarget.value);
        //audioEngineContext.metric.sliderPlayed(id);
        if (!playing) {
            audioEngineContext.play(id);
        } else if (playing) {
            audioEngineContext.stop();
        }
    };
    this.resize = function (event) {
        this.holder.style.width = window.innerWidth - 200 + 'px';
    };
    this.enable = function () {
        // This is used to tell the interface object that playback of this node is ready
        this.play.disabled = false;
        this.play.textContent = "Play";
        $(this.slider).removeClass('track-slider-disabled');
    };
    this.updateLoading = function (progress) {
        // progress is a value from 0 to 100 indicating the current download state of media files
    };
    this.startPlayback = function () {
        // Called when playback has begun
        playing = true;
        this.play.textContent = "Stop";
        $(".track-slider").removeClass('track-slider-playing');
        $(this.holder).addClass('track-slider-playing');
        var outsideReference = document.getElementById('outside-reference');
        if (outsideReference !== null) {
            $(outsideReference).removeClass('track-slider-playing');
        }
        interfaceContext.commentBoxes.highlightById(audioObject.id);
        if (audioObject.specification.image !== undefined) {
            interfaceContext.imageHolder.setImage(audioObject.specification.image);
        }
    };
    this.stopPlayback = function () {
        // Called when playback has stopped. This gets called even if playback never started!
        playing = false;
        this.play.textContent = "Play";
        $(this.holder).removeClass('track-slider-playing');
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
        // Return the current value of the object. If there is no value, return 0
        return this.slider.value;
    };
    this.getPresentedId = function () {
        // Return the presented ID of the object. For instance, the APE has sliders starting from 0. Whilst AB has alphabetical scale
        return this.title.textContent;
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
        node.textContent = this.slider.value;
        return node;
    };
    this.error = function () {
        // audioObject has an error!!
        this.playback.textContent = "Error";
        $(this.playback).addClass("error-colour");
    };
}

function resizeWindow(event) {
    // Called on every window resize event, use this to scale your page properly

    var numObj = document.getElementsByClassName('track-slider').length;
    var totalHeight = (numObj * 125) - 25;
    // Cheers edge for making me delete a canvas every resize.
    var canvas = document.getElementById('scale-canvas');
    var new_canvas = document.createElement("canvas");
    new_canvas.id = 'scale-canvas';
    new_canvas.style.marginLeft = "100px";
    canvas.parentElement.appendChild(new_canvas);
    canvas.parentElement.removeChild(canvas);
    new_canvas.width = window.innerWidth - 420;
    new_canvas.height = totalHeight;
    for (var i in audioEngineContext.audioObjects) {
        if (audioEngineContext.audioObjects[i].specification.type != 'outside-reference') {
            audioEngineContext.audioObjects[i].interfaceDOM.resize(event);
        }
    }
    document.getElementById("slider").style.height = totalHeight + 50 + 'px';
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
    var textHolder = document.getElementById('scale-text-holder');
    textHolder.innerHTML = "";
    ctx.fillStyle = "#000000";
    ctx.setLineDash([1, 4]);
    scales.forEach(function (scale) {
        var posPercent = scale.position / 100.0;
        var posPix = Math.round(width * posPercent);
        if (posPix <= 0) {
            posPix = 1;
        }
        if (posPix >= width) {
            posPix = width - 1;
        }
        if (ticks) {
            ctx.moveTo(posPix, 0);
            ctx.lineTo(posPix, height);
            ctx.stroke();
        }

        var text = document.createElement('div');
        text.align = "center";
        var textC = document.createElement('span');
        textC.textContent = scale.text;
        text.appendChild(textC);
        text.className = "scale-text";
        textHolder.appendChild(text);
        text.style.width = Math.ceil($(text).width()) + 'px';
        text.style.left = (posPix + 100 - ($(text).width() / 2)) + 'px';
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

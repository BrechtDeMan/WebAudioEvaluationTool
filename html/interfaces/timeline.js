/**
 * WAET Timeline
 * This interface plots a waveform timeline per audio fragment on a page. Clicking on the fragment will generate a comment box for processing.
 */
/*globals interfaceContext, window, document, console, audioEngineContext, testState, $, storage */
// Once this is loaded and parsed, begin execution
loadInterface();

function loadInterface() {
    // Use this to do any one-time page / element construction. For instance, placing any stationary text objects,
    // holding div's, or setting up any nodes which are present for the entire test sequence

    interfaceContext.insertPoint.innerHTML = ""; // Clear the current schema

    interfaceContext.insertPoint = document.getElementById("topLevelBody");
    var testContent = document.createElement("div");

    // Create the top div and Title element
    var title = document.createElement("div");
    title.className = "title";
    title.align = "center";
    var titleSpan = document.createElement("span");
    titleSpan.id = "test-title";
    titleSpan.textContent = "Listening Test";
    title.appendChild(titleSpan);

    var pagetitle = document.createElement("div");
    pagetitle.className = "pageTitle";
    pagetitle.align = "center";
    titleSpan = document.createElement("span");
    titleSpan.id = "page-title";
    pagetitle.appendChild(titleSpan);

    // Create Interface buttons
    var interfaceButtons = document.createElement("div");
    interfaceButtons.id = 'interface-buttons';
    interfaceButtons.style.height = "25px";

    // Create playback start/stop points
    var playback = document.createElement("button");
    playback.innerHTML = "Stop";
    playback.id = "playback-button";
    playback.onclick = function () {
        if (audioEngineContext.status == 1) {
            audioEngineContext.stop();
            this.innerHTML = "Stop";
            var time = audioEngineContext.timer.getTestTime();
            console.log("Stopped at " + time);
        }
    };
    // Create Submit (save) button
    var submit = document.createElement("button");
    submit.innerHTML = 'Next';
    submit.onclick = buttonSubmitClick;
    submit.id = 'submit-button';
    submit.style.float = 'left';
    // Append the interface buttons into the interfaceButtons object.
    interfaceButtons.appendChild(submit);
    interfaceButtons.appendChild(playback);

    // Create outside reference holder
    var outsideRef = document.createElement("div");
    outsideRef.id = "outside-reference-holder";

    // Create content point
    var content = document.createElement("div");
    content.id = "timeline-test-content";

    //Inject
    testContent.appendChild(title);
    testContent.appendChild(pagetitle);
    testContent.appendChild(interfaceButtons);
    testContent.appendChild(outsideRef);
    testContent.appendChild(content);
    interfaceContext.insertPoint.appendChild(testContent);

    // Load the full interface
    testState.initialise();
    testState.advanceState();
}

function loadTest(page) {
    // Called each time a new test page is to be build. The page specification node is the only item passed in
    var content = document.getElementById("timeline-test-content");
    content.innerHTML = "";
    var interfaceObj = interfaceContext.getCombinedInterfaces(page);
    if (interfaceObj.length > 1) {
        console.log("WARNING - This interface only supports one <interface> node per page. Using first interface node");
    }
    interfaceObj = interfaceObj[0];

    //Set the page title
    if (typeof page.title == "string" && page.title.length > 0) {
        document.getElementById("test-title").textContent = page.title;
    }

    if (interfaceObj.title !== null) {
        document.getElementById("page-title").textContent = interfaceObj.title;
    }

    if (interfaceObj.image !== undefined) {
        document.getElementById("timeline-test-content").parentElement.insertBefore(interfaceContext.imageHolder.root, document.getElementById("timeline-test-content"));
        interfaceContext.imageHolder.setImage(interfaceObj.image);
    }

    // Delete outside reference
    var outsideReferenceHolder = document.getElementById("outside-reference-holder");
    outsideReferenceHolder.innerHTML = "";

    var commentBoxPrefix = "Comment on track";
    if (interfaceObj.commentBoxPrefix !== undefined) {
        commentBoxPrefix = interfaceObj.commentBoxPrefix;
    }
    var index = 0;
    var interfaceScales = testState.currentStateMap.interfaces[0].scales;
    var labelType = page.label;
    if (labelType == "default") {
        labelType = "number";
    }
    $(page.audioElements).each(function (pageIndex, element) {
        var audioObject = audioEngineContext.newTrack(element);
        if (page.audioElements.type == 'outside-reference') {
            var refNode = interfaceContext.outsideReferenceDOM(audioObject, index, outsideReferenceHolder);
            audioObject.bindInterface(refNode);
        } else {
            var label = interfaceContext.getLabel(labelType, index, page.labelStart);
            var node = new interfaceObject(audioObject, label);

            content.appendChild(node.DOM);
            audioObject.bindInterface(node);
        }
    });

    resizeWindow();
}

function interfaceObject(audioObject, labelstr) {
    // Each audio object has a waveform guide and self-generated comments
    this.parent = audioObject;
    this.DOM = document.createElement("div");
    this.DOM.className = "timeline-element";
    this.DOM.id = audioObject.specification.id;

    var root = document.createElement("div");
    root.className = "timeline-element-content";
    this.DOM.appendChild(root);

    var label = document.createElement("div");
    label.style.textAlign = "center";
    var labelSpan = document.createElement("span");
    labelSpan.textContent = "Fragment " + labelstr;
    label.appendChild(labelSpan);
    root.appendChild(label);

    var canvasHolder = document.createElement("div");
    canvasHolder.className = "timeline-element-canvas-holder";
    var buttonHolder = document.createElement("div");
    buttonHolder.className = "timeline-element-button-holder";
    var commentHolder = document.createElement("div");
    commentHolder.className = "timeline-element-comment-holder";

    root.appendChild(canvasHolder);
    root.appendChild(buttonHolder);
    root.appendChild(commentHolder);

    this.comments = {
        parent: this,
        list: [],
        Comment: function (parent, time, str) {
            this.parent = parent;
            this.time = time;
            this.DOM = document.createElement("div");
            this.DOM.className = "comment-entry";
            var titleHolder = document.createElement("div");
            titleHolder.className = "comment-entry-header";
            this.title = document.createElement("span");
            if (str !== undefined) {
                this.title.textContent = str;
            } else {
                this.title.textContent = "Time: " + time.toFixed(2) + "s";
            }
            titleHolder.appendChild(this.title);
            this.textarea = document.createElement("textarea");
            this.textarea.className = "comment-entry-text";
            this.DOM.appendChild(titleHolder);
            this.DOM.appendChild(this.textarea);

            this.clear = {
                DOM: document.createElement("button"),
                parent: this,
                handleEvent: function () {
                    this.parent.parent.deleteComment(this.parent);
                }
            };
            this.clear.DOM.textContent = "Delete";
            this.clear.DOM.addEventListener("click", this.clear);
            titleHolder.appendChild(this.clear.DOM);

            this.resize = function () {
                var w = window.innerWidth;
                w = Math.min(w, 800);
                w = Math.max(w, 200);
                var elem_w = w / 2.5;
                elem_w = Math.max(elem_w, 190);
                this.DOM.style.width = elem_w + "px";
                this.textarea.style.width = (elem_w - 5) + "px";
            };
            this.buildXML = function (root) {
                //storage.document.createElement();
                var node = storage.document.createElement("comment");
                var question = storage.document.createElement("question");
                var comment = storage.document.createElement("response");
                node.setAttribute("time", this.time);
                question.textContent = this.title.textContent;
                comment.textContent = this.textarea.value;
                node.appendChild(question);
                node.appendChild(comment);
                root.appendChild(node);
            };
            this.resize();
        },
        newComment: function (time) {
            var node = new this.Comment(this, time);
            this.list.push(node);
            commentHolder.appendChild(node.DOM);
            return node;
        },
        deleteComment: function (comment) {
            var index = this.list.findIndex(function (element, index, array) {
                if (element == comment) {
                    return true;
                }
                return false;
            }, comment);
            if (index == -1) {
                return false;
            }
            var node = this.list.splice(index, 1);
            comment.DOM.remove();
            this.parent.canvas.drawMarkers();
            return true;
        },
        clearList: function () {
            while (this.list.length > 0) {
                this.deleteComment(this.list[0]);
            }
        }
    };

    this.canvas = {
        parent: this,
        comments: this.comments,
        layer1: document.createElement("canvas"),
        layer2: document.createElement("canvas"),
        layer3: document.createElement("canvas"),
        layer4: document.createElement("canvas"),
        resize: function () {
            var w = $(this.layer1.parentElement).width();
            this.layer1.width = w;
            this.layer2.width = w;
            this.layer3.width = w;
            this.layer4.width = w;
            this.layer1.style.width = w + "px";
            this.layer2.style.width = w + "px";
            this.layer3.style.width = w + "px";
            this.layer4.style.width = w + "px";
            this.drawWaveform();
            this.drawMarkers();
        },
        handleEvent: function (event) {
            switch (event.currentTarget) {
                case this.layer1:
                    switch (event.type) {
                        case "mousemove":
                            this.drawMouse(event);
                            break;
                        case "mouseleave":
                            this.clearCanvas(this.layer1);
                            break;
                        case "click":
                            var rect = this.layer1.getBoundingClientRect();
                            var pixX = event.clientX - rect.left;
                            var tpp = this.parent.parent.buffer.buffer.duration / this.layer1.width;
                            this.comments.newComment(pixX * tpp);
                            this.drawMarkers();
                            break;
                    }
                    break;
            }
        },
        drawWaveform: function () {
            if (this.parent.parent === undefined || this.parent.parent.buffer === undefined) {
                return;
            }
            var buffer = this.parent.parent.buffer.buffer;
            var context = this.layer4.getContext("2d");
            context.lineWidth = 1;
            context.strokeStyle = "#888";
            context.clearRect(0, 0, this.layer4.width, this.layer4.height);
            var data = buffer.getChannelData(0);
            var t_per_pixel = buffer.duration / this.layer4.width;
            var s_per_pixel = data.length / this.layer4.width;
            var pixX = 0;
            while (pixX < this.layer4.width) {
                var start = Math.floor(s_per_pixel * pixX);
                var end = Math.min(Math.ceil(s_per_pixel * (pixX + 1)), data.length);
                var frame = data.subarray(start, end);
                var min = frame[0];
                var max = min;
                for (var n = 0; n < frame.length; n++) {
                    if (frame[n] < min) {
                        min = frame[n];
                    }
                    if (frame[n] > max) {
                        max = frame[n];
                    }
                }
                // Assuming min/max normalised between [-1, 1] to map to [150, 0]
                context.beginPath();
                context.moveTo(pixX + 0.5, (min + 1) * -75 + 150);
                context.lineTo(pixX + 0.5, (max + 1) * -75 + 150);
                context.stroke();
                pixX++;
            }
        },
        drawMouse: function (event) {
            var context = this.layer1.getContext("2d");
            context.clearRect(0, 0, this.layer1.width, this.layer1.height);
            var rect = this.layer1.getBoundingClientRect();
            var pixX = event.clientX - rect.left;
            pixX = Math.floor(pixX) - 0.5;
            context.strokeStyle = "#800";
            context.beginPath();
            context.moveTo(pixX, 0);
            context.lineTo(pixX, this.layer1.height);
            context.stroke();
        },
        drawTicker: function () {
            var context = this.layer2.getContext("2d");
            context.clearRect(0, 0, this.layer2.width, this.layer2.height);
            var time = this.parent.parent.getCurrentPosition();
            var ratio = time / this.parent.parent.buffer.buffer.duration;
            var pixX = Math.floor(ratio * this.layer2.width) + 0.5;
            context.strokeStyle = "#080";
            context.beginPath();
            context.moveTo(pixX, 0);
            context.lineTo(pixX, this.layer2.height);
            context.stroke();
        },
        drawMarkers: function () {
            if (this.parent.parent === undefined || this.parent.parent.buffer === undefined) {
                return;
            }
            var context = this.layer3.getContext("2d");
            context.clearRect(0, 0, this.layer3.width, this.layer3.height);
            context.strokeStyle = "#008";
            var tpp = this.parent.parent.buffer.buffer.duration / this.layer1.width;
            for (var i = 0; i < this.comments.list.length; i++) {
                var comment = this.comments.list[i];
                var pixX = Math.floor(comment.time / tpp) + 0.5;
                context.beginPath();
                context.moveTo(pixX, 0);
                context.lineTo(pixX, this.layer3.height);
                context.stroke();
            }
        },
        clearCanvas: function (canvas) {
            var context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    };
    this.canvas.layer1.className = "timeline-element-canvas canvas-layer1 canvas-disabled";
    this.canvas.layer2.className = "timeline-element-canvas canvas-layer2";
    this.canvas.layer3.className = "timeline-element-canvas canvas-layer3";
    this.canvas.layer4.className = "timeline-element-canvas canvas-layer3";
    this.canvas.layer1.height = "160";
    this.canvas.layer2.height = "160";
    this.canvas.layer3.height = "160";
    this.canvas.layer4.height = "160";
    var canvasDiv = document.createElement("div");
    canvasDiv.appendChild(this.canvas.layer1);
    canvasDiv.appendChild(this.canvas.layer2);
    canvasDiv.appendChild(this.canvas.layer3);
    canvasDiv.appendChild(this.canvas.layer4);
    canvasHolder.appendChild(canvasDiv);
    this.canvas.layer1.addEventListener("mousemove", this.canvas);
    this.canvas.layer1.addEventListener("mouseleave", this.canvas);
    this.canvas.layer1.addEventListener("click", this.canvas);

    if (audioObject.specification.image) {
        canvasDiv.style.width = "80%";
        var image = document.createElement("img");
        image.src = audioObject.specification.image;
        image.className = "timeline-element-image";
        canvasHolder.appendChild(image);
    } else {
        canvasDiv.style.width = "100%";
    }

    var canvasIntervalID = null;

    this.playButton = {
        parent: this,
        DOM: document.createElement("button"),
        handleEvent: function (event) {
            var id = this.parent.parent.id;
            var str = this.DOM.textContent;
            if (str == "Play") {
                audioEngineContext.play(id);
            } else if (str == "Stop") {
                audioEngineContext.stop();
            }
        }
    };
    this.playButton.DOM.addEventListener("click", this.playButton);
    this.playButton.DOM.className = "timeline-button timeline-button-disabled";
    this.playButton.DOM.disabled = true;
    this.playButton.DOM.textContent = "Wait";

    buttonHolder.appendChild(this.playButton.DOM);

    this.resize = function () {
        this.canvas.resize();
    };

    this.enable = function () {
        // This is used to tell the interface object that playback of this node is ready
        this.canvas.layer1.addEventListener("click", this.canvas);
        this.canvas.layer1.className = "timeline-element-canvas canvas-layer1";
        this.playButton.DOM.className = "timeline-button timeline-button-play";
        this.playButton.DOM.textContent = "Play";
        this.playButton.DOM.disabled = false;

        this.canvas.drawWaveform();
    };
    this.updateLoading = function (progress) {
        // progress is a value from 0 to 100 indicating the current download state of media files
        progress = String(progress);
        progress = progress.substr(0, 5);
        this.playButton.DOM.textContent = "Loading: " + progress + '%';
    };
    this.startPlayback = function () {
        // Called when playback has begun
        var animate = function () {
            this.canvas.drawTicker.call(this.canvas);
            if (this.playButton.DOM.textContent == "Stop") {
                window.requestAnimationFrame(animate);
            }
        }.bind(this);
        this.playButton.DOM.textContent = "Stop";
        interfaceContext.commentBoxes.highlightById(audioObject.id);
        canvasIntervalID = window.requestAnimationFrame(animate);
    };
    this.stopPlayback = function () {
        // Called when playback has stopped. This gets called even if playback never started!
        window.clearInterval(canvasIntervalID);
        this.canvas.clearCanvas(this.canvas.layer2);
        this.playButton.DOM.textContent = "Play";
        var box = interfaceContext.commentBoxes.boxes.find(function (a) {
            return a.id === audioObject.id;
        });
        if (box) {
            box.highlight(false);
        }
    };
    this.getValue = function () {
        // Return the current value of the object. If there is no value, return 0
        return 0;
    };
    this.getPresentedId = function () {
        // Return the presented ID of the object. For instance, the APE has sliders starting from 0. Whilst AB has alphabetical scale
        return labelSpan.textContent;
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
        return null;
    };
    this.error = function () {
        // If there is an error with the audioObject, this will be called to indicate a failure
    };
}

function resizeWindow(event) {
    // Called on every window resize event, use this to scale your page properly
    for (var i = 0; i < audioEngineContext.audioObjects.length; i++) {
        audioEngineContext.audioObjects[i].interfaceDOM.resize();
    }
}

function buttonSubmitClick() {
    if (audioEngineContext.timer.testStarted === false) {
        interfaceContext.lightbox.post("Warning", 'You have not started the test! Please click play on a sample to begin the test!');
        return;
    }
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
                    //Check if all fragments have been played
                    checkState = interfaceContext.checkAllPlayed(checks[i].errorMessage);
                    break;
                case 'fragmentFullPlayback':
                    //Check if all fragments have played to their full length
                    checkState = interfaceContext.checkFragmentsFullyPlayed(checks[i].errorMessage);
                    break;
                case 'fragmentComments':
                    checkState = interfaceContext.checkAllCommented(checks[i].errorMessage);
                    break;
                default:
                    console.log("WARNING - Check option " + checks[i].check + " is not supported on this interface");
                    break;
            }
            if (checkState === false) {
                canContinue = false;
            }
        }
        if (!canContinue) {
            return;
        }
    }

    if (canContinue) {
        if (audioEngineContext.status == 1) {
            var playback = document.getElementById('playback-button');
            playback.click();
            // This function is called when the submit button is clicked. Will check for any further tests to perform, or any post-test options
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

    for (var i = 0; i < audioEngineContext.audioObjects.length; i++) {
        var id = audioEngineContext.audioObjects[i].specification.id;
        var commentsList = audioEngineContext.audioObjects[i].interfaceDOM.comments.list;
        var root = audioEngineContext.audioObjects[i].storeDOM;
        for (var j = 0; j < commentsList.length; j++) {
            commentsList[j].buildXML(root);
        }
    }
}

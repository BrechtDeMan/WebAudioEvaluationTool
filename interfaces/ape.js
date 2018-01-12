/**
 *  ape.js
 *  Create the APE interface
 */

/*globals window,interfaceContext, document, audioEngineContext, console, $, Interface, testState, storage, specification */
/*globals metricTracker */
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

    // Bindings for interfaceContext
    interfaceContext.checkAllPlayed = function () {
        var hasBeenPlayed = audioEngineContext.checkAllPlayed();
        if (hasBeenPlayed.length > 0) // if a fragment has not been played yet
        {
            var str = "";
            if (hasBeenPlayed.length > 1) {
                for (var i = 0; i < hasBeenPlayed.length; i++) {
                    var ao_id = audioEngineContext.audioObjects[hasBeenPlayed[i]].interfaceDOM.getPresentedId();
                    str = str + ao_id; // start from 1
                    if (i < hasBeenPlayed.length - 2) {
                        str += ", ";
                    } else if (i == hasBeenPlayed.length - 2) {
                        str += " or ";
                    }
                }
                str = 'You have not played fragments ' + str + ' yet. Please listen, rate and comment all samples before submitting.';
            } else {
                str = 'You have not played fragment ' + (audioEngineContext.audioObjects[hasBeenPlayed[0]].interfaceDOM.getPresentedId()) + ' yet. Please listen, rate and comment all samples before submitting.';
            }
            this.storeErrorNode(str);
            interfaceContext.lightbox.post("Message", str);
            return false;
        }
        return true;
    };

    interfaceContext.checkAllMoved = function () {
        var state = true;
        var str = 'You have not moved the following sliders. ';
        for (var i = 0; i < this.interfaceSliders.length; i++) {
            var interfaceTID = [];
            for (var j = 0; j < this.interfaceSliders[i].metrics.length; j++) {
                var ao_id = this.interfaceSliders[i].sliders[j].getAttribute("trackIndex");
                if (this.interfaceSliders[i].metrics[j].wasMoved === false && audioEngineContext.audioObjects[ao_id].interfaceDOM.canMove()) {
                    state = false;
                    interfaceTID.push(j);
                }
            }
            if (interfaceTID.length !== 0) {
                var interfaceName = this.interfaceSliders[i].interfaceObject.title;
                if (interfaceName === undefined) {
                    str += 'On axis ' + String(i + 1) + ' you must move ';
                } else {
                    str += 'On axis "' + interfaceName + '" you must move ';
                }
                if (interfaceTID.length == 1) {
                    str += 'slider ' + (audioEngineContext.audioObjects[interfaceTID[0]].interfaceDOM.getPresentedId()) + '. '; // start from 1
                } else {
                    str += 'sliders ';
                    for (var k = 0; k < interfaceTID.length - 1; k++) {
                        str += (audioEngineContext.audioObjects[interfaceTID[k]].interfaceDOM.getPresentedId()) + ', '; // start from 1
                    }
                    str += (audioEngineContext.audioObjects[interfaceTID[interfaceTID.length - 1]].interfaceDOM.getPresentedId()) + '. ';
                }
            }
        }
        if (state !== true) {
            this.storeErrorNode(str);
            interfaceContext.lightbox.post("Message", str);
            console.log(str);
        }
        return state;
    };

    interfaceContext.checkScaleRange = function () {
        var audioObjs = audioEngineContext.audioObjects;
        var audioHolder = testState.stateMap[testState.stateIndex];
        var interfaceObject = this.interfaceSliders[0].interfaceObject;
        var state = true;
        var str = '';
        this.interfaceSliders.forEach(function (sliderHolder, i) {
            var scales = (function () {
                var scaleRange = interfaceObject.options.find(function (a) {
                    return a.name == "scalerange";
                });
                return {
                    min: scaleRange.min,
                    max: scaleRange.max
                };
            })();
            var range = sliderHolder.sliders.reduce(function (a, b) {
                var v = convSliderPosToRate(b) * 100.0;
                return {
                    min: Math.min(a.min, v),
                    max: Math.max(a.max, v)
                };
            }, {
                min: 100,
                max: 0
            });
            if (range.min >= scales.min || range.max <= scales.max) {
                state = false;
                str += 'On axis "' + sliderHolder.interfaceObject.title + '" you have not used the full width of the scale. ';
            }
        });
        if (state !== true) {
            this.storeErrorNode(str);
            interfaceContext.lightbox.post("Message", str);
            console.log(str);
        }
        return state;
    };

    Interface.prototype.objectSelected = null;
    Interface.prototype.objectMoved = false;
    Interface.prototype.selectObject = function (object) {
        if (this.objectSelected === null) {
            this.objectSelected = object;
            this.objectMoved = false;
        }
    };
    Interface.prototype.moveObject = function () {
        if (this.objectMoved === false) {
            this.objectMoved = true;
        }
    };
    Interface.prototype.releaseObject = function () {
        this.objectSelected = null;
        this.objectMoved = false;
    };
    Interface.prototype.getSelectedObject = function () {
        return this.objectSelected;
    };
    Interface.prototype.hasSelectedObjectMoved = function () {
        return this.objectMoved;
    };

    // Bindings for slider interfaces
    Interface.prototype.interfaceSliders = [];

    // Bindings for audioObjects

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

    // Create Interface buttons!
    var interfaceButtons = document.createElement('div');
    interfaceButtons.id = 'interface-buttons';

    // Create playback start/stop points
    var playback = document.createElement("button");
    playback.innerHTML = 'Stop';
    playback.id = 'playback-button';
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
    // Append the interface buttons into the interfaceButtons object.
    interfaceButtons.appendChild(playback);
    interfaceButtons.appendChild(submit);

    var sliderHolder = document.createElement("div");
    sliderHolder.id = "slider-holder";

    // Create outside reference holder
    var outsideRef = document.createElement("div");
    outsideRef.id = "outside-reference-holder";

    // Global parent for the comment boxes on the page
    var feedbackHolder = document.createElement('div');
    feedbackHolder.id = 'feedbackHolder';

    testContent.style.zIndex = 1;
    interfaceContext.insertPoint.innerHTML = ""; // Clear the current schema

    // Inject into HTML
    testContent.appendChild(title); // Insert the title
    testContent.appendChild(interfaceButtons);
    testContent.appendChild(outsideRef);
    testContent.appendChild(sliderHolder);
    testContent.appendChild(feedbackHolder);
    interfaceContext.insertPoint.appendChild(testContent);

    // Load the full interface
    testState.initialise();
    testState.advanceState();

}

function loadTest(audioHolderObject) {
    var width = window.innerWidth;
    var height = window.innerHeight;
    var id = audioHolderObject.id;

    interfaceContext.interfaceSliders = [];

    var feedbackHolder = document.getElementById('feedbackHolder');
    var sliderHolder = document.getElementById('slider-holder');
    feedbackHolder.innerHTML = "";
    sliderHolder.innerHTML = "";

    // Set labelType if default to number
    if (audioHolderObject.label === "default" || audioHolderObject.label === "") {
        audioHolderObject.label = "number";
    }
    // Set the page title
    if (typeof audioHolderObject.title == "string" && audioHolderObject.title.length > 0) {
        document.getElementById("test-title").textContent = audioHolderObject.title;
    }


    // Delete outside reference
    document.getElementById("outside-reference-holder").innerHTML = "";

    var interfaceObj = interfaceContext.getCombinedInterfaces(audioHolderObject);
    interfaceObj.forEach(function (interfaceObjectInstance) {
        // Create the div box to center align
        interfaceContext.interfaceSliders.push(new interfaceSliderHolder(interfaceObjectInstance, audioHolderObject));
    });
    interfaceObj.forEach(function (interface) {
        interface.options.forEach(function (option) {
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
    });

    var commentBoxPrefix = "Comment on fragment";

    var commentShow = audioHolderObject.elementComments;

    var loopPlayback = audioHolderObject.loop;

    var currentTestHolder = document.createElement('audioHolder');
    currentTestHolder.id = audioHolderObject.id;
    currentTestHolder.repeatCount = audioHolderObject.repeatCount;

    // Find all the audioElements from the audioHolder
    $(audioHolderObject.audioElements).each(function (index, element) {
        // Find URL of track
        // In this jQuery loop, variable 'this' holds the current audioElement.
        var audioObject = audioEngineContext.newTrack(element);
        // Check if an outside reference
        if (element.type == 'outside-reference') {
            // Construct outside reference;
            var orNode = new outsideReferenceDOM(audioObject, index, document.getElementById("outside-reference-holder"));
            audioObject.bindInterface(orNode);
        } else {
            // Create a slider per track
            var sliderNode = new sliderObject(audioObject, interfaceObj, index);
            audioObject.bindInterface(sliderNode);
            interfaceContext.commentBoxes.createCommentBox(audioObject);
        }
    });

    // Initialse the interfaceSlider object metrics

    $('.track-slider').mousedown(function (event) {
        interfaceContext.selectObject($(this)[0]);
    });
    $('.track-slider').on('touchstart', null, function (event) {
        interfaceContext.selectObject($(this)[0]);
    });

    $('.track-slider').mousemove(function (event) {
        event.preventDefault();
    });

    $('.slider').mousemove(function (event) {
        event.preventDefault();
        var obj = interfaceContext.getSelectedObject();
        if (obj === null) {
            return;
        }
        var move = event.clientX - 6;
        var w = $(event.currentTarget).width();
        move = Math.max(50, move);
        move = Math.min(w + 50, move);
        $(obj).css("left", move + "px");
        interfaceContext.moveObject();
    });

    $('.slider').on('touchmove', null, function (event) {
        event.preventDefault();
        var obj = interfaceContext.getSelectedObject();
        if (obj === null) {
            return;
        }
        var move = event.originalEvent.targetTouches[0].clientX - 6;
        var w = $(event.currentTarget).width();
        move = Math.max(50, move);
        move = Math.min(w + 50, move);
        $(obj).css("left", move + "px");
        interfaceContext.moveObject();
    });

    $(document).mouseup(function (event) {
        event.preventDefault();
        var obj = interfaceContext.getSelectedObject();
        if (obj === null) {
            return;
        }
        var interfaceID = obj.parentElement.getAttribute("interfaceid");
        var trackID = obj.getAttribute("trackindex");
        var id;
        if (interfaceContext.hasSelectedObjectMoved() === true) {
            var l = $(obj).css("left");
            id = obj.getAttribute('trackIndex');
            var time = audioEngineContext.timer.getTestTime();
            var rate = convSliderPosToRate(obj);
            audioEngineContext.audioObjects[id].metric.moved(time, rate);
            interfaceContext.interfaceSliders[interfaceID].metrics[trackID].moved(time, rate);
            console.log("slider " + id + " moved to " + rate + ' (' + time + ')');
            obj.setAttribute("slider-value", convSliderPosToRate(obj));
        } else {
            id = Number(obj.attributes.trackIndex.value);
            //audioEngineContext.metric.sliderPlayed(id);
            audioEngineContext.play(id);
        }
        interfaceContext.releaseObject();
    });

    $('.slider').on('touchend', null, function (event) {
        var obj = interfaceContext.getSelectedObject();
        if (obj === null) {
            return;
        }
        var interfaceID = obj.parentElement.getAttribute("interfaceid");
        var trackID = obj.getAttribute("trackindex");
        if (interfaceContext.hasSelectedObjectMoved() === true) {
            var l = $(obj).css("left");
            var id = obj.getAttribute('trackIndex');
            var time = audioEngineContext.timer.getTestTime();
            var rate = convSliderPosToRate(obj);
            audioEngineContext.audioObjects[id].metric.moved(time, rate);
            interfaceContext.interfaceSliders[interfaceID].metrics[trackID].moved(time, rate);
            console.log("slider " + id + " moved to " + rate + ' (' + time + ')');
        }
        interfaceContext.releaseObject();
    });

    var interfaceList = audioHolderObject.interfaces.concat(specification.interfaces);
    for (var k = 0; k < interfaceList.length; k++) {
        for (var i = 0; i < interfaceList[k].options.length; i++) {
            if (interfaceList[k].options[i].type == 'show' && interfaceList[k].options[i].name == 'playhead') {
                var playbackHolder = document.getElementById('playback-holder');
                if (playbackHolder === null) {
                    playbackHolder = document.createElement('div');
                    playbackHolder.id = "playback-holder";
                    playbackHolder.style.width = "100%";
                    playbackHolder.align = 'center';
                    playbackHolder.appendChild(interfaceContext.playhead.object);
                    feedbackHolder.appendChild(playbackHolder);
                }
            } else if (interfaceList[k].options[i].type == 'show' && interfaceList[k].options[i].name == 'page-count') {
                var pagecountHolder = document.getElementById('page-count');
                if (pagecountHolder === null) {
                    pagecountHolder = document.createElement('div');
                    pagecountHolder.id = 'page-count';
                }
                pagecountHolder.innerHTML = '<span>Page ' + (testState.stateIndex + 1) + ' of ' + testState.stateMap.length + '</span>';
                var inject = document.getElementById('interface-buttons');
                inject.appendChild(pagecountHolder);
            } else if (interfaceList[k].options[i].type == 'show' && interfaceList[k].options[i].name == 'volume') {
                if (document.getElementById('master-volume-holder') === null) {
                    feedbackHolder.appendChild(interfaceContext.volume.object);
                }
            } else if (interfaceList[k].options[i].type == 'show' && interfaceList[k].options[i].name == 'comments') {
                interfaceContext.commentBoxes.showCommentBoxes(feedbackHolder, true);
                break;
            }
        }
    }

    $(audioHolderObject.commentQuestions).each(function (index, element) {
        var node = interfaceContext.createCommentQuestion(element);
        feedbackHolder.appendChild(node.holder);
    });

    //testWaitIndicator();
}

function interfaceSliderHolder(interfaceObject, page) {
    this.sliders = [];
    this.metrics = [];
    this.id = document.getElementsByClassName("sliderCanvasDiv").length;
    this.name = interfaceObject.name;
    this.interfaceObject = interfaceObject;
    this.sliderDOM = document.createElement('div');
    this.sliderDOM.className = 'sliderCanvasDiv';
    this.sliderDOM.id = 'sliderCanvasHolder-' + this.id;
    this.imageHolder = (function () {
        var imageController = {};
        imageController.root = document.createElement("div");
        imageController.root.className = "imageController";
        imageController.img = document.createElement("img");
        imageController.root.appendChild(imageController.img);
        imageController.setImage = function (src) {
            imageController.img.src = "";
            if (typeof src !== "string" || src.length === undefined) {
                return;
            }
            imageController.img.src = src;
        };
        return imageController;
    })();

    var pagetitle = document.createElement('div');
    pagetitle.className = "pageTitle";
    pagetitle.align = "center";
    var titleSpan = document.createElement('span');
    titleSpan.id = "pageTitle-" + this.id;
    if (interfaceObject.title !== undefined && typeof interfaceObject.title == "string") {
        titleSpan.textContent = interfaceObject.title;
    } else {
        titleSpan.textContent = "Axis " + String(this.id + 1);
    }
    pagetitle.appendChild(titleSpan);
    this.sliderDOM.appendChild(pagetitle);

    if (interfaceObject.image !== undefined || page.audioElements.some(function (a) {
            return a.image !== undefined;
        })) {
        this.sliderDOM.appendChild(this.imageHolder.root);
        this.imageHolder.setImage(interfaceObject.image);
    }
    // Create the slider box to hold the slider elements
    this.canvas = document.createElement('div');
    if (this.name !== undefined)
        this.canvas.id = 'slider-' + this.name;
    else
        this.canvas.id = 'slider-' + this.id;
    this.canvas.setAttribute("interfaceid", this.id);
    this.canvas.className = 'slider';
    this.canvas.align = "left";
    this.canvas.addEventListener('dragover', function (event) {
        event.preventDefault();
        event.dataTransfer.effectAllowed = 'none';
        event.dataTransfer.dropEffect = 'copy';
        return false;
    }, false);
    this.sliderDOM.appendChild(this.canvas);

    // Create the div to hold any scale objects
    this.scale = document.createElement('div');
    this.scale.className = 'sliderScale';
    this.scale.id = 'sliderScaleHolder-' + this.id;
    this.scale.align = 'left';
    this.sliderDOM.appendChild(this.scale);
    var positionScale = this.canvas.style.width.substr(0, this.canvas.style.width.length - 2);
    var offset = 50;
    var dest = document.getElementById("slider-holder").appendChild(this.sliderDOM);
    interfaceObject.scales.forEach(function (scaleObj) {
        var position = Number(scaleObj.position) * 0.01;
        var pixelPosition = (position * $(this.canvas).width()) + offset;
        var scaleDOM = document.createElement('span');
        scaleDOM.className = "ape-marker-text";
        scaleDOM.textContent = scaleObj.text;
        scaleDOM.setAttribute('value', position);
        this.scale.appendChild(scaleDOM);
        scaleDOM.style.left = Math.floor((pixelPosition - ($(scaleDOM).width() / 2))) + 'px';
    }, this);

    this.createSliderObject = function (audioObject, label) {
        var trackObj = document.createElement('div');
        trackObj.align = "center";
        trackObj.className = 'track-slider track-slider-disabled track-slider-' + audioObject.id;
        trackObj.id = 'track-slider-' + this.id + '-' + audioObject.id;
        trackObj.setAttribute('trackIndex', audioObject.id);
        if (this.name !== undefined) {
            trackObj.setAttribute('interface-name', this.name);
        } else {
            trackObj.setAttribute('interface-name', this.id);
        }
        var offset = 50;
        // Distribute it randomnly
        var w = window.innerWidth - (offset + 8) * 2;
        w = Math.random() * w;
        w = Math.floor(w + (offset + 8));
        trackObj.style.left = w + 'px';
        this.canvas.appendChild(trackObj);
        this.sliders.push(trackObj);
        this.metrics.push(new metricTracker(this));
        var labelHolder = document.createElement("span");
        labelHolder.textContent = label;
        trackObj.appendChild(labelHolder);
        var rate = convSliderPosToRate(trackObj);
        this.metrics[this.metrics.length - 1].initialise(rate);
        trackObj.setAttribute("slider-value", rate);
        return trackObj;
    };

    this.resize = function (event) {
        var sliderDiv = this.canvas;
        var sliderScaleDiv = this.scale;
        var width = $(sliderDiv).width();
        var marginsize = 50;
        // Move sliders into new position
        this.sliders.forEach(function (slider, index) {
            var pix = Number(slider.getAttribute("slider-value")) * width;
            slider.style.left = (pix + marginsize) + 'px';
        });

        // Move scale labels
        for (var index = 0; index < this.scale.children.length; index++) {
            var scaleObj = this.scale.children[index];
            var position = Number(scaleObj.attributes.value.value);
            var pixelPosition = (position * width) + marginsize;
            scaleObj.style.left = Math.floor((pixelPosition - ($(scaleObj).width() / 2))) + 'px';
        }
    };

    this.playing = function (id) {
        var node = audioEngineContext.audioObjects.find(function (a) {
            return a.id == id;
        });
        if (node === undefined) {
            this.imageHolder.setImage(interfaceObject.image || "");
            return;
        }
        var imgurl = node.specification.image || interfaceObject.image || "";
        this.imageHolder.setImage(imgurl);
    };
}

function sliderObject(audioObject, interfaceObjects, index) {
    // Create a new slider object;
    this.parent = audioObject;
    this.trackSliderObjects = [];
    this.label = interfaceContext.getLabel(audioObject.specification.parent.label, index, audioObject.specification.parent.labelStart);
    this.playing = false;
    for (var i = 0; i < interfaceContext.interfaceSliders.length; i++) {
        var trackObj = interfaceContext.interfaceSliders[i].createSliderObject(audioObject, this.label);
        this.trackSliderObjects.push(trackObj);
    }

    // Onclick, switch playback to that track

    this.enable = function () {
        if (this.parent.state == 1) {
            $(this.trackSliderObjects).each(function (i, trackObj) {
                $(trackObj).removeClass('track-slider-disabled');
            });
        }
    };
    this.updateLoading = function (progress) {
        if (progress != 100) {
            progress = String(progress);
            progress = progress.split('.')[0];
            this.trackSliderObjects[0].children[0].textContent = progress + '%';
        } else {
            this.trackSliderObjects[0].children[0].textContent = this.label;
        }
    };
    this.startPlayback = function () {
        $('.track-slider').removeClass('track-slider-playing');
        var name = ".track-slider-" + this.parent.id;
        $(name).addClass('track-slider-playing');
        interfaceContext.commentBoxes.highlightById(audioObject.id);
        $('.outside-reference').removeClass('track-slider-playing');
        this.playing = true;

        if (this.parent.specification.parent.playOne || specification.playOne) {
            $('.track-slider').addClass('track-slider-disabled');
            $('.outside-reference').addClass('track-slider-disabled');
        }
        interfaceContext.interfaceSliders.forEach(function (ts) {
            ts.playing(this.parent.id);
        }, this);
    };
    this.stopPlayback = function () {
        if (this.playing) {
            this.playing = false;
            var name = ".track-slider-" + this.parent.id;
            $(name).removeClass('track-slider-playing');
            $('.track-slider').removeClass('track-slider-disabled');
            $('.outside-reference').removeClass('track-slider-disabled');
            var box = interfaceContext.commentBoxes.boxes.find(function (a) {
                return a.id === audioObject.id;
            });
            if (box) {
                box.highlight(false);
            }
        }
    };
    this.exportXMLDOM = function (audioObject) {
        // Called by the audioObject holding this element. Must be present
        var obj = [];
        $(this.trackSliderObjects).each(function (i, trackObj) {
            var node = storage.document.createElement('value');
            if (trackObj.getAttribute("interface-name") !== "null") {
                node.setAttribute("interface-name", trackObj.getAttribute("interface-name"));
            }
            node.textContent = convSliderPosToRate(trackObj);
            obj.push(node);
        });

        return obj;
    };
    this.getValue = function () {
        return convSliderPosToRate(this.trackSliderObjects[0]);
    };
    this.getPresentedId = function () {
        return this.label;
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

function outsideReferenceDOM(audioObject, index, inject) {
    this.parent = audioObject;
    this.outsideReferenceHolder = document.createElement('div');
    this.outsideReferenceHolder.id = 'outside-reference';
    this.outsideReferenceHolder.className = 'outside-reference track-slider-disabled';
    var outsideReferenceHolderspan = document.createElement('span');
    outsideReferenceHolderspan.textContent = 'Reference';
    this.outsideReferenceHolder.appendChild(outsideReferenceHolderspan);
    this.outsideReferenceHolder.setAttribute('track-id', index);

    this.handleEvent = function (event) {
        audioEngineContext.play(audioObject.id);
        $('.track-slider').removeClass('track-slider-playing');
        $('.comment-div').removeClass('comment-box-playing');
        $(this.outsideReferenceHolder).addClass('track-slider-playing');
    };
    this.outsideReferenceHolder.addEventListener("click", this.handleEvent);
    inject.appendChild(this.outsideReferenceHolder);
    this.enable = function () {
        if (this.parent.state == 1) {
            $(this.outsideReferenceHolder).removeClass('track-slider-disabled');
        }
    };
    this.updateLoading = function (progress) {
        if (progress != 100) {
            progress = String(progress);
            progress = progress.split('.')[0];
            this.outsideReferenceHolder.firstChild.textContent = progress + '%';
        } else {
            this.outsideReferenceHolder.firstChild.textContent = "Play Reference";
        }
    };
    this.startPlayback = function () {
        $('.track-slider').removeClass('track-slider-playing');
        $(this.outsideReferenceHolder).addClass('track-slider-playing');
        $('.comment-div').removeClass('comment-box-playing');
    };
    this.stopPlayback = function () {
        $(this.outsideReferenceHolder).removeClass('track-slider-playing');
    };
    this.exportXMLDOM = function (audioObject) {
        return null;
    };
    this.getValue = function () {
        return 0;
    };
    this.getPresentedId = function () {
        return 'reference';
    };
    this.canMove = function () {
        return false;
    };
    this.error = function () {
        // audioObject has an error!!
        this.outsideReferenceHolder.textContent = "Error";
        $(this.outsideReferenceHolder).addClass("error-colour");
    };
}

function buttonSubmitClick() {
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
                    checkState = interfaceContext.checkAllCommented(checks[i].errorMessage);
                    break;
                case 'scalerange':
                    // Check the scale is used to its full width outlined by the node
                    checkState = interfaceContext.checkScaleRange(checks[i].errorMessage);
                    break;
                default:
                    console.log("WARNING - Check option " + checks[i].name + " is not supported on this interface");
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
                interfaceContext.lightbox.post("Warning", 'You have not started the test! Please click a fragment to begin the test!');
                return;
            }
        }
        testState.advanceState();
    }
}

function convSliderPosToRate(trackSlider) {
    var slider = trackSlider.parentElement;
    var maxPix = $(slider).width();
    var marginsize = 50;
    var pix = trackSlider.style.left;
    pix = pix.substr(0, pix.length - 2);
    var rate = (pix - marginsize) / maxPix;
    return rate;
}

function resizeWindow(event) {
    // Function called when the window has been resized.
    // MANDATORY FUNCTION

    // Resize the slider objects
    for (var i = 0; i < interfaceContext.interfaceSliders.length; i++) {
        interfaceContext.interfaceSliders[i].resize(event);
    }
}

function pageXMLSave(store, pageSpecification) {
    // MANDATORY
    // Saves a specific test page
    // You can use this space to add any extra nodes to your XML <audioHolder> saves
    // Get the current <page> information in store (remember to appendChild your data to it)
    // pageSpecification is the current page node configuration
    // To create new XML nodes, use storage.document.createElement();

    if (interfaceContext.interfaceSliders.length == 1) {
        // If there is only one axis, there only needs to be one metric return
        return;
    }
    var audioelements = store.getElementsByTagName("audioelement");
    for (var i = 0; i < audioelements.length; i++) {
        // Have to append the metric specific nodes
        if (pageSpecification.outsideReference === undefined || pageSpecification.outsideReference.id != audioelements[i].id) {
            var inject = audioelements[i].getElementsByTagName("metric");
            if (inject.length === 0) {
                inject = storage.document.createElement("metric");
            } else {
                inject = inject[0];
            }
            for (var k = 0; k < interfaceContext.interfaceSliders.length; k++) {
                var mrnodes = interfaceContext.interfaceSliders[k].metrics[i].exportXMLDOM(inject);
                for (var j = 0; j < mrnodes.length; j++) {
                    var name = mrnodes[j].getAttribute("name");
                    if (name == "elementTracker" || name == "elementTrackerFull" || name == "elementInitialPosition" || name == "elementFlagMoved") {
                        if (interfaceContext.interfaceSliders[k].name !== null) {
                            mrnodes[j].setAttribute("interface-name", interfaceContext.interfaceSliders[k].name);
                        }
                        mrnodes[j].setAttribute("interface-id", k);
                    }
                }
            }
        }
    }
}

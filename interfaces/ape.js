/**
 *  ape.js
 *  Create the APE interface
 */

/*globals window,interfaceContext, document, audioEngineContext, console, $, Interface, testState, storage, specification */
/*globals metricTracker */
// Once this is loaded and parsed, begin execution
loadInterface();
window.APE = undefined;

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
    window.APE = new ape();
    testState.initialise();
    testState.advanceState();
}

function loadTest(audioHolderObject) {
    APE.clear();
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

    APE.initialisePage(audioHolderObject);

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

function ape() {
    var axis = []
    var DOMRoot = document.getElementById("slider-holder");
    var AOIs = [];
    var page = undefined;

    function audioObjectInterface(audioObject, parent) {
        // The audioObject communicates with this object
        var playing = false;
        var sliders = [];
        this.enable = function () {
            sliders.forEach(function (s) {
                s.enable();
            })
        }

        this.updateLoading = function (p) {
            sliders.forEach(function (s) {
                s.updateLoading(p);
            })
        }

        this.startPlayback = function () {
            playing = true;
            sliders.forEach(function (s) {
                s.playing();
            });
        }

        this.stopPlayback = function () {
            playing = false;
            sliders.forEach(function (s) {
                s.stopped();
            });
        }

        this.getValue = function () {
            return sliders[0].value();
        }

        this.getPresentedId = function () {
            return sliders[0].label;
        }

        this.canMove = function () {
            return true;
        }

        this.exportXMLDOM = function (audioObject) {
            var elements = [];
            sliders.forEach(function (s) {
                elements.push(s.exportXMLDOM());
            });
            return elements;
        }

        this.error = function () {
            sliders.forEach(function (s) {
                s.error();
            });
        }

        this.addSlider = function (s) {
            sliders.push(s);
        }

        this.clicked = function (event) {
            if (!playing) {
                audioEngineContext.play(audioObject.id);
            } else {
                audioEngineContext.stop();
            }
            playing = !playing;
        }

        this.pageXMLSave = function (store) {
            var inject = audioObject.storeDOM.getElementsByTagName("metric")[0];
            sliders.forEach(function (s) {
                s.pageXMLSave(inject);
            });
        }

    }

    function axisObject(interfaceObject, parent) {

        function sliderInterface(AOI, axisInterface) {
            var trackObj = document.createElement('div');
            var labelHolder = document.createElement("span");
            var label = "";
            var metric = new metricTracker(this);
            trackObj.align = "center";
            trackObj.className = 'track-slider track-slider-disabled';
            trackObj.appendChild(labelHolder);
            trackObj.style.left = (Math.random() * $(sliderRail).width()) - 50 + "px";
            axisInterface.sliderRail.appendChild(trackObj);
            metric.initialise(this.value);
            this.setLabel = function (s) {
                label = s;
            }
            this.resize = function (event) {
                var width = $(axisInterface.sliderRail).width();
                var w = Number(value * width + 50);
                trackObj.style.left = String(w) + "px";
            }
            this.playing = function () {
                trackObj.classList.add("track-slider-playing");
            }
            this.stopped = function () {
                trackObj.classList.remove("track-slider-playing");
            }
            this.enable = function () {
                trackObj.addEventListener("mousedown", this);
                trackObj.addEventListener("mouseup", this);
                trackObj.addEventListener("touchstart", this);
                trackObj.classList.remove("track-slider-disabled");
                labelHolder.textContent = label;
            }
            this.updateLoading = function (progress) {
                labelHolder.textContent = progress + "%";
            }
            this.exportXMLDOM = function () {
                var node = storage.document.createElement('value');
                node.setAttribute("interface-name", axisInterface.name)
                node.textContent = this.value();
                return node;
            }
            this.error = function () {
                trackObj.classList.add("error-colour");
                trackObj.removeEventListener("mousedown");
                trackObj.removeEventListener("mouseup");
                trackObj.removeEventListener("touchstart");
            }
            var timing = undefined;
            this.handleEvent = function (e) {
                // This is only for the mousedown / touchdown
                if (e.preventDefault) {
                    e.preventDefault();
                }
                if (e.type == "mousedown" || e.type == "touchstart") {
                    axisInterface.mousedown(this);
                } else if (e.type == "mouseup") {
                    axisInterface.mouseup(this);
                }
            }
            this.clicked = function (e) {
                AOI.clicked();
            }
            this.pageXMLSave = function (inject) {
                var nodes = metric.exportXMLDOM(inject);
                nodes.forEach(function (elem) {
                    var name = elem.getAttribute("name");
                    if (name == "elementTracker" || name == "elementTrackerFull" || name == "elementInitialPosition" || name == "elementFlagMoved") {
                        mrnodes[j].setAttribute("interface-name", axisInterface.name);
                    }
                });
            }
            Object.defineProperties(this, {
                "DOM": {
                    "value": trackObj
                },
                "value": {
                    "value": function () {
                        var maxPix = $(axisInterface.sliderRail).width();
                        var pix = trackObj.style.left.substr(0, trackObj.style.left.length - 2);
                        return (pix - 50) / maxPix;
                    }
                },
                "moveToPixel": {
                    "value": function (pix) {
                        var t = audioEngineContext.timer.getTestTime();
                        trackObj.style.left = String(pix) + "px";
                        metric.moved(t, this.value);
                    }
                },
                "label": {
                    "get": function () {
                        return label;
                    },
                    "set": function () {}
                }
            });
        }

        function createScaleMarkers(interfaceObject, root, w) {
            interfaceObject.scales.forEach(function (scaleObj) {
                var position = Number(scaleObj.position) * 0.01;
                var pixelPosition = (position * w) + 50;
                var scaleDOM = document.createElement('span');
                scaleDOM.className = "ape-marker-text";
                scaleDOM.textContent = scaleObj.text;
                scaleDOM.setAttribute('value', position);
                root.appendChild(scaleDOM);
                scaleDOM.style.left = Math.floor((pixelPosition - ($(scaleDOM).width() / 2))) + 'px';
            }, this);
        }
        var sliders = [];
        var UI = {
            selected: undefined,
            startTime: undefined
        }
        this.name = interfaceObject.name;
        var DOMRoot = document.createElement("div");
        DOMRoot.className = "sliderCanvasDiv";
        DOMRoot.id = "sliderCanvasHolder-" + this.name;
        var sliders = [];

        var axisTitle = document.createElement("div");
        axisTitle.className = "pageTitle";
        axisTitle.align = "center";
        var titleSpan = document.createElement('span');
        titleSpan.id = "pageTitle-" + this.name;
        if (interfaceObject.title !== undefined && typeof interfaceObject.title == "string") {
            titleSpan.textContent = interfaceObject.title;
        } else {
            titleSpan.textContent = "Axis " + String(this.id + 1);
        }
        axisTitle.appendChild(titleSpan);
        DOMRoot.appendChild(axisTitle);

        var imageHolder = (function () {
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
        if (interfaceObject.image !== undefined || page.audioElements.some(function (a) {
                return a.image !== undefined;
            })) {
            DOMRoot.appendChild(imageHolder.root);
            imageHolder.setImage(interfaceObject.image);
        }

        // Now create the slider box to hold the fragment sliders
        var sliderRail = document.createElement("div");
        sliderRail.id = "sliderrail-" + this.name;
        sliderRail.className = "slider";
        sliderRail.align = "left";
        DOMRoot.appendChild(sliderRail);

        // Create the div to hold any scale objects
        var scale = document.createElement("div");
        scale.className = "sliderScale";
        scale.id = "slider-scale-holder-" + this.name;
        scale.slign = "left";
        DOMRoot.appendChild(scale);
        createScaleMarkers(interfaceObject, scale, $(sliderRail).width());

        parent.getDOMRoot().appendChild(DOMRoot);

        this.resize = function (event) {
            var w = $(sliderRail).width();
            var marginsize = 50;
            sliders.forEach(function (s) {
                s.resize();
            });
            scale.innerHTML = "";
            createScaleMarkers(interfaceObject, scale, $(sliderRail).width());
        }
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
        }
        this.stopped = function () {
            var imgurl = interfaceObject.image || "";
            this.imageHolder.setImage(imgurl);
        }
        this.addSlider = function (aoi) {
            var node = new sliderInterface(aoi, this);
            sliders.push(node);
            return node;
        }
        this.mousedown = function (sliderUI) {
            UI.selected = sliderUI;
            UI.startTime = new Date();
        }
        this.mouseup = function (sliderUI) {
            var delta = new Date() - UI.startTime;
            if (delta < 200) {
                UI.selected.clicked();
            }
            UI.selected = undefined;
            UI.startTime = undefined;
        }
        this.handleEvent = function (event) {
            if (event.preventDefault) {
                event.preventDefault();
            }
            if (UI.selected === undefined) {
                return;
            }
            if (event.type == "mousemove") {
                var move = event.clientX - 6;
                var w = $(sliderRail).width();
                move = Math.max(50, move);
                move = Math.min(w + 50, move);
                UI.selected.moveToPixel(move);
            } else if (event.type == "touchmove") {
                var move = event.originalEvent.targetTouches[0].clientX - 6;
                var w = $(event.currentTarget).width();
                move = Math.max(50, move);
                move = Math.min(w + 50, move);
                UI.selected.moveToPixel(move);
            }
        }
        sliderRail.addEventListener("mousemove", this);
        sliderRail.addEventListener("touchmove", this);
        Object.defineProperties(this, {
            "sliderRail": {
                "value": sliderRail
            }
        });
    }
    this.getDOMRoot = function () {
        return DOMRoot;
    }
    this.getPage = function () {
        return page;
    }
    this.clear = function () {
        page = undefined;
        axis = [];
        AOIs = [];
        DOMRoot.innerHTML = "";
    }
    this.initialisePage = function (page_init) {
        this.clear();
        page = page_init;
        var interfaceObj = interfaceContext.getCombinedInterfaces(page);
        // Create each of the interface axis
        interfaceObj.forEach(function (i) {
            var node = new axisObject(i, this);
            axis.push(node);
        }, this);

        // Create the audioObject interface objects for each aO.
        page.audioElements.forEach(function (element, index) {
            var audioObject = audioEngineContext.newTrack(element);
            if (element.type == 'outside-reference') {
                // Construct outside reference;
                var orNode = new outsideReferenceDOM(audioObject, index, document.getElementById("outside-reference-holder"));
                audioObject.bindInterface(orNode);
            } else {
                var aoi = new audioObjectInterface(audioObject, this);
                var label = interfaceContext.getLabel(page.label, index, page.labelStart);
                axis.forEach(function (a) {
                    var node = a.addSlider(aoi);
                    node.setLabel(label);
                    aoi.addSlider(node);
                    audioObject.bindInterface(aoi);
                });
            }
        });
    }
    this.pageXMLSave = function (store, pageSpecification) {
        AOIs.forEach(function (ao) {
            ao.pageXMLSave(store);
        });
    }
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

    APE.pageXMLSave(store, pageSpecification);
}

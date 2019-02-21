/**
 * core.js
 *
 * Main script to run, calls all other core functions and manages loading/store to backend.
 * Also contains all global variables.
 */

/*globals window, document, XMLDocument, Element, XMLHttpRequest, DOMParser, console, Blob, $, Promise, navigator */
/*globals AudioBuffer, AudioBufferSourceNode */
/*globals Specification, calculateLoudness, WAVE, validateXML, showdown, pageXMLSave, loadTest, resizeWindow */

/* create the web audio API context and store in audioContext*/
var audioContext; // Hold the browser web audio API
var projectXML; // Hold the parsed setup XML
var schemaXSD; // Hold the parsed schema XSD
var specification;
var interfaceContext;
var storage;
var popup; // Hold the interfacePopup object
var testState;
var currentTrackOrder = []; // Hold the current XML tracks in their (randomised) order
var audioEngineContext; // The custome AudioEngine object
var gReturnURL;
var gSaveFilenamePrefix;


// Add a prototype to the bufferSourceNode to reference to the audioObject holding it
AudioBufferSourceNode.prototype.owner = undefined;
// Add a prototype to the bufferSourceNode to hold when the object was given a play command
AudioBufferSourceNode.prototype.playbackStartTime = undefined;
// Add a prototype to the bufferNode to hold the desired LINEAR gain
AudioBuffer.prototype.playbackGain = undefined;
// Add a prototype to the bufferNode to hold the computed LUFS loudness
AudioBuffer.prototype.lufs = undefined;

// Convert relative URLs into absolutes
function escapeHTML(s) {
    return s.split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;');
}

function qualifyURL(url) {
    var el = document.createElement('div');
    el.innerHTML = '<a href="' + escapeHTML(url) + '">x</a>';
    return el.firstChild.href;
}

function insertParam(s, key, value)
{
    key = encodeURI(key); value = encodeURI(value);
    if (s.split("?").length == 1) {
        s = s + ">";
    } else {
        s = s + "&";
    }
    return s+key+"="+value;
}

// Firefox does not have an XMLDocument.prototype.getElementsByName
// and there is no searchAll style command, this custom function will
// search all children recusrively for the name. Used for XSD where all
// element nodes must have a name and therefore can pull the schema node
XMLDocument.prototype.getAllElementsByName = function (name) {
    name = String(name);
    var selected = this.documentElement.getAllElementsByName(name);
    return selected;
};

Element.prototype.getAllElementsByName = function (name) {
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while (node !== null) {
        if (node.getAttribute('name') == name) {
            selected.push(node);
        }
        if (node.childElementCount > 0) {
            selected = selected.concat(node.getAllElementsByName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
};

XMLDocument.prototype.getAllElementsByTagName = function (name) {
    name = String(name);
    var selected = this.documentElement.getAllElementsByTagName(name);
    return selected;
};

Element.prototype.getAllElementsByTagName = function (name) {
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while (node !== null) {
        if (node.nodeName == name) {
            selected.push(node);
        }
        if (node.childElementCount > 0) {
            selected = selected.concat(node.getAllElementsByTagName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
};

// Firefox does not have an XMLDocument.prototype.getElementsByName
if (typeof XMLDocument.prototype.getElementsByName != "function") {
    XMLDocument.prototype.getElementsByName = function (name) {
        name = String(name);
        var node = this.documentElement.firstElementChild;
        var selected = [];
        while (node !== null) {
            if (node.getAttribute('name') == name) {
                selected.push(node);
            }
            node = node.nextElementSibling;
        }
        return selected;
    };
}

var check_dependancies = function () {
    // This will check for the data dependancies
    if (typeof (jQuery) != "function") {
        return false;
    }
    if (typeof (Specification) != "function") {
        return false;
    }
    if (typeof (calculateLoudness) != "function") {
        return false;
    }
    if (typeof (WAVE) != "function") {
        return false;
    }
    if (typeof (validateXML) != "function") {
        return false;
    }
    return true;
};

var onload = function () {
    // Function called once the browser has loaded all files.
    // This should perform any initial commands such as structure / loading documents

    // Create a web audio API context
    // Fixed for cross-browser support
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();

    // Create test state
    testState = new stateMachine();

    // Create the popup interface object
    popup = new interfacePopup();

    // Create the specification object
    specification = new Specification();

    // Create the storage object
    storage = new Storage();

    // Create the interface object
    interfaceContext = new Interface(specification);

    // Define window callbacks for interface
    window.onresize = function (event) {
        interfaceContext.resizeWindow(event);
    };

    if (window.location.search.length !== 0) {
        var search = window.location.search.split('?')[1];
        // Now split the requests into pairs
        var searchQueries = search.split('&');
        var url;
        for (var i in searchQueries) {
            // Split each key-value pair
            searchQueries[i] = searchQueries[i].split('=');
            var key = searchQueries[i][0];
            var value = decodeURIComponent(searchQueries[i][1]);
            switch (key) {
                case "url":
                    url = value;
                    specification.url = url;
                    break;
                case "returnURL":
                    gReturnURL = value;
                    break;
                case "testKey":
                    storage.sessionLinked = value;
                    break;
                case "saveFilenamePrefix":
                    storage.filenamePrefix = value;
                    break;
            }
        }
        loadProjectSpec(url);
        window.onbeforeunload = function () {
            return "Please only leave this page once you have completed the tests. Are you sure you have completed all testing?";
        };
    }
    interfaceContext.lightbox.resize();
};

function loadProjectSpec(url) {
    // Load the project document from the given URL, decode the XML and instruct audioEngine to get audio data
    // If url is null, request client to upload project XML document
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", 'xml/test-schema.xsd', true);
    xmlhttp.onload = function () {
        specification.processSchema(xmlhttp.response);
        var r = new XMLHttpRequest();
        r.open('GET', url, true);
        r.onload = function () {
            loadProjectSpecCallback(r.response);
        };
        r.onerror = function () {
            document.getElementsByTagName('body')[0].innerHTML = null;
            var msg = document.createElement("h3");
            msg.textContent = "FATAL ERROR";
            var span = document.createElement("p");
            span.textContent = "There was an error when loading your XML file. Please check your path in the URL. After the path to this page, there should be '?url=path/to/your/file.xml'. Check the spelling of your filename as well. If you are still having issues, check the log of the python server or your webserver distribution for 404 codes for your file.";
            document.getElementsByTagName('body')[0].appendChild(msg);
            document.getElementsByTagName('body')[0].appendChild(span);
        };
        r.send();
    };
    xmlhttp.send();
}

function loadProjectSpecCallback(response) {
    // Function called after asynchronous download of XML project specification
    //var decode = $.parseXML(response);
    //projectXML = $(decode);

    // Check if XML is new or a resumption
    var parse = new DOMParser();
    var responseDocument = parse.parseFromString(response, 'text/xml');
    var errorNode = responseDocument.getElementsByTagName('parsererror');
    var msg, span;
    if (errorNode.length >= 1) {
        msg = document.createElement("h3");
        msg.textContent = "FATAL ERROR";
        span = document.createElement("span");
        span.textContent = "The XML parser returned the following errors when decoding your XML file";
        document.getElementsByTagName('body')[0].innerHTML = null;
        document.getElementsByTagName('body')[0].appendChild(msg);
        document.getElementsByTagName('body')[0].appendChild(span);
        document.getElementsByTagName('body')[0].appendChild(errorNode[0]);
        return;
    }
    if (responseDocument === undefined || responseDocument.firstChild === undefined) {
        msg = document.createElement("h3");
        msg.textContent = "FATAL ERROR";
        span = document.createElement("span");
        span.textContent = "The project XML was not decoded properly, try refreshing your browser and clearing caches. If the problem persists, contact the test creator.";
        document.getElementsByTagName('body')[0].innerHTML = null;
        document.getElementsByTagName('body')[0].appendChild(msg);
        document.getElementsByTagName('body')[0].appendChild(span);
        return;
    }
    if (responseDocument.firstChild.nodeName == "waet") {
        // document is a specification

        // Perform XML schema validation
        var Module = {
            xml: response,
            schema: specification.getSchemaString(),
            arguments: ["--noout", "--schema", 'test-schema.xsd', 'document.xml']
        };
        projectXML = responseDocument;
        var xmllint = validateXML(Module);
        console.log(xmllint);
        if (xmllint != 'document.xml validates\n') {
            document.getElementsByTagName('body')[0].innerHTML = null;
            msg = document.createElement("h3");
            msg.textContent = "FATAL ERROR";
            span = document.createElement("h4");
            span.textContent = "The XML validator returned the following errors when decoding your XML file";
            document.getElementsByTagName('body')[0].appendChild(msg);
            document.getElementsByTagName('body')[0].appendChild(span);
            xmllint = xmllint.split('\n');
            for (var i in xmllint) {
                document.getElementsByTagName('body')[0].appendChild(document.createElement('br'));
                span = document.createElement("span");
                span.textContent = xmllint[i];
                document.getElementsByTagName('body')[0].appendChild(span);
            }
            return;
        }
        // Build the specification
        specification.decode(projectXML);
        // Generate the session-key
        storage.initialise();

    } else if (responseDocument.firstChild.nodeName == "waetresult") {
        // document is a result
        projectXML = document.implementation.createDocument(null, "waet");
        projectXML.firstChild.appendChild(responseDocument.getElementsByTagName('waet')[0].getElementsByTagName("setup")[0].cloneNode(true));
        var child = responseDocument.firstChild.firstChild,
            copy;
        while (child !== null) {
            if (child.nodeName == "survey") {
                // One of the global survey elements
                if (child.getAttribute("state") == "complete") {
                    // We need to remove this survey from <setup>
                    var location = child.getAttribute("location");
                    var globalSurveys = projectXML.getElementsByTagName("setup")[0].getElementsByTagName("survey")[0];
                    while (globalSurveys !== null) {
                        if (location == "pre" || location == "before") {
                            if (globalSurveys.getAttribute("location") == "pre" || globalSurveys.getAttribute("location") == "before") {
                                projectXML.getElementsByTagName("setup")[0].removeChild(globalSurveys);
                                break;
                            }
                        } else {
                            if (globalSurveys.getAttribute("location") == "post" || globalSurveys.getAttribute("location") == "after") {
                                projectXML.getElementsByTagName("setup")[0].removeChild(globalSurveys);
                                break;
                            }
                        }
                        globalSurveys = globalSurveys.nextElementSibling;
                    }
                } else {
                    // We need to complete this, so it must be regenerated by store
                    copy = child;
                    child = child.previousElementSibling;
                    responseDocument.firstChild.removeChild(copy);
                }
            } else if (child.nodeName == "page") {
                if (child.getAttribute("state") == "empty") {
                    // We need to complete this page
                    projectXML.firstChild.appendChild(responseDocument.getElementById(child.getAttribute("ref")).cloneNode(true));
                    copy = child;
                    child = child.previousElementSibling;
                    responseDocument.firstChild.removeChild(copy);
                }
            }
            child = child.nextElementSibling;
        }
        // Build the specification
        specification.decode(projectXML);
        // Use the original
        storage.initialise(responseDocument);
    }
    /// CHECK FOR SAMPLE RATE COMPATIBILITY
    if (isFinite(specification.sampleRate)) {
        if (Number(specification.sampleRate) != audioContext.sampleRate) {
            var errStr = 'Sample rates do not match! Requested ' + Number(specification.sampleRate) + ', got ' + audioContext.sampleRate + '. Please set the sample rate to match before completing this test.';
            interfaceContext.lightbox.post("Error", errStr);
            return;
        }
    }

    var getInterfaces = new XMLHttpRequest();
    getInterfaces.open("GET", "interfaces/interfaces.json");
    getInterfaces.onerror = function (e) {
        throw (e);
    };
    getInterfaces.onload = function () {
        if (getInterfaces.status !== 200) {
            throw (new Error(getInterfaces.status));
        }
        // Get the current interface
        var name = specification.interface,
            head = document.getElementsByTagName("head")[0],
            data = JSON.parse(getInterfaces.responseText),
            interfaceObject = data.interfaces.find(function (e) {
                return e.name == name;
            });
        if (!interfaceObject) {
            throw ("Cannot load desired interface");
        }
        interfaceObject.scripts.forEach(function (v) {
            var script = document.createElement("script");
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", v);
            head.appendChild(script);
        });
        interfaceObject.css.forEach(function (v) {
            var css = document.createElement("link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("type", "text/css");
            css.setAttribute("href", v);
            head.appendChild(css);
        });
    };
    getInterfaces.send();

    if (gReturnURL !== undefined) {
        console.log("returnURL Overide from " + specification.returnURL + " to " + gReturnURL);
        specification.returnURL = gReturnURL;
    }
    if (gSaveFilenamePrefix !== undefined) {
        specification.saveFilenamePrefix = gSaveFilenamePrefix;
    }

    // Create the audio engine object
    audioEngineContext = new AudioEngine(specification);
}

function createProjectSave(destURL) {
    // Clear the window.onbeforeunload
    window.onbeforeunload = null;
    // Save the data from interface into XML and send to destURL
    // If destURL is null then download XML in client
    // Now time to render file locally
    var xmlDoc = storage.finish();
    var parent = document.createElement("div");
    parent.appendChild(xmlDoc);
    var file = [parent.innerHTML];
    if (destURL == "local") {
        var bb = new Blob(file, {
            type: 'application/xml'
        });
        var dnlk = window.URL.createObjectURL(bb);
        var a = document.createElement("a");
        a.hidden = '';
        a.href = dnlk;
        a.download = "save.xml";
        a.textContent = "Save File";

        popup.showPopup();
        popup.popupContent.innerHTML = "<span>Please save the file below to give to your test supervisor</span><br>";
        popup.popupContent.appendChild(a);
    } else {
        var projectReturn = "";
        if (typeof specification.projectReturn == "string") {
            if (specification.projectReturn.substr(0, 4) == "http") {
                projectReturn = specification.projectReturn;
            }
        }
        storage.SessionKey.finish().then(function (resolved) {
            var converter = new showdown.Converter();
            if (typeof specification.returnURL == "string" && specification.returnURL.length > 0) {
                window.location = insertParam(specification.returnURL, "testKey", storage.SessionKey.key);
            } else {
                popup.popupContent.innerHTML = converter.makeHtml(specification.exitText);
            }
        }, function (message) {
            console.log("Save: Error! " + message.textContent);
            createProjectSave("local");
        });
        popup.showPopup();
        popup.popupContent.innerHTML = null;
        popup.popupContent.textContent = "Submitting. Please Wait";
        if (typeof (popup.hideNextButton) === "function") {
            popup.hideNextButton();
        }
        if (typeof (popup.hidePreviousButton) === "function") {
            popup.hidePreviousButton();
        }
    }
}

function errorSessionDump(msg) {
    // Create the partial interface XML save
    // Include error node with message on why the dump occured
    popup.showPopup();
    popup.popupContent.innerHTML = null;
    var err = document.createElement('error');
    var parent = document.createElement("div");
    if (typeof msg === "object") {
        err.appendChild(msg);
        popup.popupContent.appendChild(msg);

    } else {
        err.textContent = msg;
        popup.popupContent.innerHTML = "ERROR : " + msg;
    }
    var xmlDoc = interfaceXMLSave();
    xmlDoc.appendChild(err);
    parent.appendChild(xmlDoc);
    var file = [parent.innerHTML];
    var bb = new Blob(file, {
        type: 'application/xml'
    });
    var dnlk = window.URL.createObjectURL(bb);
    var a = document.createElement("a");
    a.hidden = '';
    a.href = dnlk;
    a.download = "save.xml";
    a.textContent = "Save File";



    popup.popupContent.appendChild(a);
}

// Only other global function which must be defined in the interface class. Determines how to create the XML document.
function interfaceXMLSave() {
    // Create the XML string to be exported with results
    return storage.finish();
}

function linearToDecibel(gain) {
    return 20.0 * Math.log10(gain);
}

function decibelToLinear(gain) {
    return Math.pow(10, gain / 20.0);
}

function secondsToSamples(time, fs) {
    return Math.round(time * fs);
}

function samplesToSeconds(samples, fs) {
    return samples / fs;
}

function randomString(length) {
    var str = "";
    for (var i = 0; i < length; i += 2) {
        var num = Math.floor(Math.random() * 1295);
        str += num.toString(36);
    }
    return str;
    //return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

function randomiseOrder(input) {
    // This takes an array of information and randomises the order
    var N = input.length;

    var inputSequence = []; // For safety purposes: keep track of randomisation
    for (var counter = 0; counter < N; ++counter)
        inputSequence.push(counter); // Fill array
    var inputSequenceClone = inputSequence.slice(0);

    var holdArr = [];
    var outputSequence = [];
    for (var n = 0; n < N; n++) {
        // First pick a random number
        var r = Math.random();
        // Multiply and floor by the number of elements left
        r = Math.floor(r * input.length);
        // Pick out that element and delete from the array
        holdArr.push(input.splice(r, 1)[0]);
        // Do the same with sequence
        outputSequence.push(inputSequence.splice(r, 1)[0]);
    }
    console.log(inputSequenceClone.toString()); // print original array to console
    console.log(outputSequence.toString()); // print randomised array to console
    return holdArr;
}

function randomSubArray(array, num) {
    if (num > array.length) {
        num = array.length;
    }
    var ret = [];
    while (num > 0) {
        var index = Math.floor(Math.random() * array.length);
        ret.push(array.splice(index, 1)[0]);
        num--;
    }
    return ret;
}

function interfacePopup() {
    // Creates an object to manage the popup
    this.popup = null;
    this.popupContent = null;
    this.popupTitle = null;
    this.popupResponse = null;
    this.buttonProceed = null;
    this.buttonPrevious = null;
    this.popupOptions = null;
    this.currentIndex = null;
    this.node = null;
    this.store = null;
    var lastNodeStart;
    $(window).keypress(function (e) {
        if (e.keyCode == 13 && popup.popup.style.visibility == 'visible' && interfaceContext.lightbox.isVisible() === false) {
            console.log(e);
            popup.buttonProceed.onclick();
            e.preventDefault();
        }
    });
    // Generators & Processors //

    function processConditional(node, value) {
        function jumpToId(jumpID) {
            var index = this.popupOptions.findIndex(function (item, index, element) {
                if (item.specification.id == jumpID) {
                    return true;
                } else {
                    return false;
                }
            }, this);
            this.currentIndex = index - 1;
        }
        var conditionFunction;
        if (node.specification.type === "question") {
            conditionFunction = processQuestionConditional;
        } else if (node.specification.type === "checkbox") {
            conditionFunction = processCheckboxConditional;
        } else if (node.specification.type === "radio") {
            conditionFunction = processRadioConditional;
        } else if (node.specification.type === "number") {
            conditionFunction = processNumberConditional;
        } else if (node.specification.type === "slider") {
            conditionFunction = processSliderConditional;
        } else {
            return;
        }
        for (var i = 0; i < node.specification.conditions.length; i++) {
            var condition = node.specification.conditions[i];
            var pass = conditionFunction(condition, value);
            var jumpID;
            if (pass) {
                jumpID = condition.jumpToOnPass;
            } else {
                jumpID = condition.jumpToOnFail;
            }
            if (jumpID !== null) {
                jumpToId.call(this, jumpID);
                break;
            }
        }
    }

    function postQuestion(node) {
        var textArea = document.createElement('textarea');
        switch (node.specification.boxsize) {
            case 'small':
                textArea.cols = "20";
                textArea.rows = "1";
                break;
            case 'normal':
                textArea.cols = "30";
                textArea.rows = "2";
                break;
            case 'large':
                textArea.cols = "40";
                textArea.rows = "5";
                break;
            case 'huge':
                textArea.cols = "50";
                textArea.rows = "10";
                break;
        }
        if (node.response === undefined) {
            node.response = "";
        } else {
            textArea.value = node.response;
        }
        this.popupResponse.appendChild(textArea);
        textArea.focus();
        this.popupResponse.style.textAlign = "center";
        this.popupResponse.style.left = "0%";
    }

    function processQuestionConditional(condition, value) {
        switch (condition.check) {
            case "equals":
                // Deliberately loose check
                if (value == condition.value) {
                    return true;
                }
                break;
            case "greaterThan":
            case "lessThan":
                console.log("Survey Element of type 'question' cannot interpret greaterThan/lessThan conditions. IGNORING");
                break;
            case "contains":
                if (value.includes(condition.value)) {
                    return true;
                }
                break;
        }
        return false;
    }

    function processQuestion(node) {
        var textArea = this.popupResponse.getElementsByTagName("textarea")[0];
        if (node.specification.mandatory === true && textArea.value.length === 0) {
            interfaceContext.lightbox.post("Error", "This question is mandatory");
            return false;
        }
        // Save the text content
        console.log("Question: " + node.specification.statement);
        console.log("Question Response: " + textArea.value);
        node.response = textArea.value;
        processConditional.call(this, node, textArea.value);
        return true;
    }

    function postCheckbox(node) {
        if (node.response === null) {
            node.response = [];
        }
        var table = document.createElement("table");
        table.className = "popup-option-list";
        table.border = "0";
        var nodelist = [];
        node.specification.options.forEach(function (option, index) {
            var tr = document.createElement("tr");
            nodelist.push(tr);
            var td = document.createElement("td");
            tr.appendChild(td);
            var input = document.createElement('input');
            input.id = option.name;
            input.type = 'checkbox';
            td.appendChild(input);

            td = document.createElement("td");
            tr.appendChild(td);
            var span = document.createElement('span');
            span.textContent = option.text;
            td.appendChild(span);
            tr = document.createElement('div');
            tr.setAttribute('name', 'option');
            tr.className = "popup-option-checbox";
            var resp;
            if (node.response.length > 0) {
                resp = node.response.find(function (a) {
                    return a.name == option.name;
                });
            }
            if (resp !== undefined) {
                if (resp.checked === true) {
                    input.checked = "true";
                }
            } else {
                node.response.push({
                    "name": option.name,
                    "text": option.text,
                    "checked": false
                });
            }
            index++;
        });
        if (node.specification.randomise) {
            nodelist = randomiseOrder(nodelist);
        }
        nodelist.forEach(function (e) {
            table.appendChild(e);
        });
        this.popupResponse.appendChild(table);
    }

    function processCheckbox(node) {
        console.log("Checkbox: " + node.specification.statement);
        var inputs = this.popupResponse.getElementsByTagName('input');
        var numChecked = 0,
            i;
        for (i = 0; i < node.specification.options.length; i++) {
            if (inputs[i].checked) {
                numChecked++;
            }
        }
        if (node.specification.min !== undefined) {
            if (node.specification.max === undefined) {
                if (numChecked < node.specification.min) {
                    var msg = "You must select at least " + node.specification.min + " option";
                    if (node.specification.min > 1) {
                        msg += "s";
                    }
                    interfaceContext.lightbox.post("Error", msg);
                    return;
                }
            } else {
                if (numChecked < node.specification.min || numChecked > node.specification.max) {
                    if (node.specification.min == node.specification.max) {
                        interfaceContext.lightbox.post("Error", "You must only select " + node.specification.min);
                    } else {
                        interfaceContext.lightbox.post("Error", "You must select between " + node.specification.min + " and " + node.specification.max);
                    }
                    return false;
                }
            }
        }
        for (i = 0; i < node.specification.options.length; i++) {
            node.response.forEach(function (a) {
                var input = this.popupResponse.querySelector("#" + a.name);
                a.checked = input.checked;
            });
            console.log(node.specification.options[i].name + ": " + inputs[i].checked);
        }
        processConditional.call(this, node, node.response);
        return true;
    }

    function processCheckboxConditional(condition, response) {
        switch (condition.check) {
            case "contains":
                for (var i = 0; i < response.length; i++) {
                    var value = response[i];
                    if (value.name === condition.value && value.checked) {
                        return true;
                    }
                }
                break;
            case "equals":
            case "greaterThan":
            case "lessThan":
                console.log("Survey Element of type 'checkbox' cannot interpret equals/greaterThan/lessThan conditions. IGNORING");
                break;
            default:
                console.log("Unknown condition. IGNORING");
                break;
        }
        return false;
    }

    function postRadio(node) {
        if (node.response === null) {
            node.response = {
                name: "",
                text: ""
            };
        }
        var table = document.createElement("table");
        table.className = "popup-option-list";
        table.border = "0";
        var nodelist = [];
        node.specification.options.forEach(function (option, index) {
            var tr = document.createElement("tr");
            nodelist.push(tr);
            var td = document.createElement("td");
            tr.appendChild(td);
            var input = document.createElement('input');
            input.id = option.name;
            input.type = 'radio';
            input.name = node.specification.id;
            td.appendChild(input);

            td = document.createElement("td");
            tr.appendChild(td);
            var span = document.createElement('span');
            span.textContent = option.text;
            td.appendChild(span);
            tr = document.createElement('div');
            tr.setAttribute('name', 'option');
            tr.className = "popup-option-checkbox";
            if (node.response.name === option.name) {
                input.checked = true;
            }
        });
        if (node.specification.randomise) {
            nodelist = randomiseOrder(nodelist);
        }
        nodelist.forEach(function (e) {
            table.appendChild(e);
        });
        this.popupResponse.appendChild(table);
    }

    function processRadio(node) {
        var optHold = this.popupResponse;
        console.log("Radio: " + node.specification.statement);
        node.response = null;
        var i = 0;
        var inputs = optHold.getElementsByTagName('input');
        var checked;
        while (checked === undefined) {
            if (i == inputs.length) {
                if (node.specification.mandatory === true) {
                    interfaceContext.lightbox.post("Error", "Please select one option");
                    return false;
                }
                break;
            }
            if (inputs[i].checked === true) {
                checked = inputs[i];
            }
            i++;
        }
        var option = node.specification.options.find(function (a) {
            return checked.id == a.name;
        });
        if (option === undefined) {
            interfaceContext.lightbox.post("Error", "A configuration error has occured, the test cannot be continued");
            throw ("ERROR - Cannot find option");
        }
        node.response = option;
        processConditional.call(this, node, node.response.name);
        return true;
    }

    function processRadioConditional(condition, response) {
        switch (condition.check) {
            case "equals":
                if (response === condition.value) {
                    return true;
                }
                break;
            case "contains":
            case "greaterThan":
            case "lessThan":
                console.log("Survey Element of type 'radio' cannot interpret contains/greaterThan/lessThan conditions. IGNORING");
                break;
            default:
                console.log("Unknown condition. IGNORING");
                break;
        }
        return false;
    }

    function postNumber(node) {
        var input = document.createElement('input');
        input.type = 'textarea';
        if (node.specification.min !== null) {
            input.min = node.specification.min;
        }
        if (node.specification.max !== null) {
            input.max = node.specification.max;
        }
        if (node.specification.step !== null) {
            input.step = node.specification.step;
        }
        if (node.response !== undefined) {
            input.value = node.response;
        }
        this.popupResponse.appendChild(input);
        this.popupResponse.style.textAlign = "center";
        this.popupResponse.style.left = "0%";
    }

    function processNumber(node) {
        var input = this.popupContent.getElementsByTagName('input')[0];
        if (node.specification.mandatory === true && input.value.length === 0) {
            interfaceContext.lightbox.post("Error", 'This question is mandatory. Please enter a number');
            return false;
        }
        var enteredNumber = Number(input.value);
        if (isNaN(enteredNumber)) {
            interfaceContext.lightbox.post("Error", 'Please enter a valid number');
            return false;
        }
        if (enteredNumber < node.specification.min && node.specification.min !== null) {
            interfaceContext.lightbox.post("Error", 'Number is below the minimum value of ' + node.specification.min);
            return false;
        }
        if (enteredNumber > node.specification.max && node.specification.max !== null) {
            interfaceContext.lightbox.post("Error", 'Number is above the maximum value of ' + node.specification.max);
            return false;
        }
        node.response = input.value;
        processConditional.call(this, node, node.response);
        return true;
    }

    function processNumberConditional(condtion, value) {
        var condition = condition;
        switch (condition.check) {
            case "greaterThan":
                if (value > Number(condition.value)) {
                    return true;
                }
                break;
            case "lessThan":
                if (value < Number(condition.value)) {
                    return true;
                }
                break;
            case "equals":
                if (value == condition.value) {
                    return true;
                }
                break;
            case "contains":
                console.log("Survey Element of type 'number' cannot interpret \"contains\" conditions. IGNORING");
                break;
            default:
                console.log("Unknown condition. IGNORING");
                break;
        }
        return false;
    }

    function postVideo(node) {
        var video = document.createElement("video");
        video.src = node.specification.url;
        this.popupResponse.appendChild(video);
    }

    function postYoutube(node) {
        var iframe = document.createElement("iframe");
        iframe.className = "youtube";
        iframe.src = node.specification.url;
        this.popupResponse.appendChild(iframe);
    }

    function postSlider(node) {
        var hold = document.createElement('div');
        var input = document.createElement('input');
        input.type = 'range';
        input.style.width = "90%";
        if (node.specification.min !== null) {
            input.min = node.specification.min;
        }
        if (node.specification.max !== null) {
            input.max = node.specification.max;
        }
        if (node.response !== undefined) {
            input.value = node.response;
        }
        hold.className = "survey-slider-text-holder";
        var minText = document.createElement('span');
        var maxText = document.createElement('span');
        minText.textContent = node.specification.leftText;
        maxText.textContent = node.specification.rightText;
        hold.appendChild(minText);
        hold.appendChild(maxText);
        this.popupResponse.appendChild(input);
        this.popupResponse.appendChild(hold);
        this.popupResponse.style.textAlign = "center";
    }

    function processSlider(node) {
        var input = this.popupContent.getElementsByTagName('input')[0];
        node.response = input.value;
        processConditional.call(this, node, node.response);
        return true;
    }

    function processSliderConditional(condition, value) {
        switch (condition.check) {
            case "contains":
                console.log("Survey Element of type 'number' cannot interpret contains conditions. IGNORING");
                break;
            case "greaterThan":
                if (value > Number(condition.value)) {
                    return true;
                }
                break;
            case "lessThan":
                if (value < Number(condition.value)) {
                    return true;
                }
                break;
            case "equals":
                if (value == condition.value) {
                    return true;
                }
                break;
            default:
                console.log("Unknown condition. IGNORING");
                break;
        }
        return false;
    }

    this.createPopup = function () {
        // Create popup window interface
        var insertPoint = document.getElementById("topLevelBody");

        this.popup = document.getElementById('popupHolder');
        this.popup.style.left = (window.innerWidth / 2) - 250 + 'px';
        this.popup.style.top = (window.innerHeight / 2) - 125 + 'px';

        this.popupContent = document.getElementById('popupContent');

        this.popupTitle = document.getElementById('popupTitleHolder');

        this.popupResponse = document.getElementById('popupResponse');

        this.buttonProceed = document.getElementById('popup-proceed');
        this.buttonProceed.onclick = function () {
            popup.proceedClicked();
        };

        this.buttonPrevious = document.getElementById('popup-previous');
        this.buttonPrevious.onclick = function () {
            popup.previousClick();
        };

        this.hidePopup();
        this.popup.style.visibility = 'hidden';
    };

    this.showPopup = function () {
        if (this.popup === null) {
            this.createPopup();
        }
        this.popup.style.visibility = 'visible';
        var blank = document.getElementsByClassName('testHalt')[0];
        blank.style.visibility = 'visible';
        this.popupResponse.style.left = "0%";
    };

    this.hidePopup = function () {
        if (this.popup) {
            this.popup.style.visibility = 'hidden';
            var blank = document.getElementsByClassName('testHalt')[0];
            blank.style.visibility = 'hidden';
            this.buttonPrevious.style.visibility = 'inherit';
        }
    };

    this.postNode = function () {
        // This will take the node from the popupOptions and display it
        var node = this.popupOptions[this.currentIndex],
            converter = new showdown.Converter(),
            p = new DOMParser();
        lastNodeStart = new Date();
        this.popupResponse.innerHTML = "";
        this.popupTitle.innerHTML = "";
        var strings = node.specification.statement.split("\n");
        strings.forEach(function (e, i, a) {
            a[i] = e.trim();
        });
        node.specification.statement = strings.join("\n");
        var statementElements = p.parseFromString(converter.makeHtml(node.specification.statement), "text/html").querySelector("body").children;
        while (statementElements.length > 0) {
            this.popupTitle.appendChild(statementElements[0]);
        }
        if (node.specification.type == 'question') {
            postQuestion.call(this, node);
        } else if (node.specification.type == 'checkbox') {
            postCheckbox.call(this, node);
        } else if (node.specification.type == 'radio') {
            postRadio.call(this, node);
        } else if (node.specification.type == 'number') {
            postNumber.call(this, node);
        } else if (node.specification.type == "video") {
            postVideo.call(this, node);
        } else if (node.specification.type == "youtube") {
            postYoutube.call(this, node);
        } else if (node.specification.type == "slider") {
            postSlider.call(this, node);
        }
        if (this.currentIndex + 1 == this.popupOptions.length) {
            if (this.node.location == "pre") {
                this.buttonProceed.textContent = 'Start';
            } else {
                this.buttonProceed.textContent = 'Submit';
            }
        } else {
            this.buttonProceed.textContent = 'Next';
        }
        if (this.currentIndex > 0)
            this.buttonPrevious.style.visibility = 'visible';
        else
            this.buttonPrevious.style.visibility = 'hidden';
    };

    this.initState = function (node, store) {
        //Call this with your preTest and postTest nodes when needed to
        // initialise the popup procedure.
        if (node.options.length > 0) {
            this.popupOptions = [];
            this.node = node;
            this.store = store;
            node.options.forEach(function (opt) {
                this.popupOptions.push({
                    specification: opt,
                    response: null
                });
            }, this);
            this.currentIndex = 0;
            this.showPopup();
            this.postNode();
        } else {
            advanceState();
        }
    };

    this.proceedClicked = function () {
        // Each time the popup button is clicked!
        var node = this.popupOptions[this.currentIndex],
            pass = true,
            timeDelta = (new Date() - lastNodeStart) / 1000.0;
        if (node == undefined) {
            advanceState();
        }
        if (timeDelta < node.specification.minWait) {
            interfaceContext.lightbox.post("Error", "Not enough time has elapsed, please wait " + (node.specification.minWait - timeDelta).toFixed(0) + " seconds");
            return;
        }
        node.elapsedTime = timeDelta;
        if (node.specification.type == 'question') {
            // Must extract the question data
            pass = processQuestion.call(this, node);
        } else if (node.specification.type == 'checkbox') {
            // Must extract checkbox data
            pass = processCheckbox.call(this, node);
        } else if (node.specification.type == "radio") {
            // Perform the conditional
            pass = processRadio.call(this, node);
        } else if (node.specification.type == "number") {
            // Perform the conditional
            pass = processNumber.call(this, node);
        } else if (node.specification.type == 'slider') {
            pass = processSlider.call(this, node);
        }
        if (pass === false) {
            return;
        }
        this.currentIndex++;
        if (this.currentIndex < this.popupOptions.length) {
            this.postNode();
        } else {
            // Reached the end of the popupOptions
            this.popupTitle.innerHTML = "";
            this.popupResponse.innerHTML = "";
            this.hidePopup();
            this.popupOptions.forEach(function (node) {
                this.store.postResult(node);
            }, this);
            this.store.complete();
            advanceState();
        }
    };

    this.previousClick = function () {
        // Triggered when the 'Back' button is clicked in the survey
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.postNode();
        }
    };

    this.resize = function (event) {
        // Called on window resize;
        if (this.popup !== null) {
            this.popup.style.left = (window.innerWidth / 2) - 250 + 'px';
            this.popup.style.top = (window.innerHeight / 2) - 125 + 'px';
            var blank = document.getElementsByClassName('testHalt')[0];
            blank.style.width = window.innerWidth;
            blank.style.height = window.innerHeight;
        }
    };
    this.hideNextButton = function () {
        this.buttonProceed.style.visibility = "hidden";
    };
    this.hidePreviousButton = function () {
        this.buttonPrevious.style.visibility = "hidden";
    };
    this.showNextButton = function () {
        this.buttonProceed.style.visibility = "visible";
    };
    this.showPreviousButton = function () {
        this.buttonPrevious.style.visibility = "visible";
    };
}

function advanceState() {
    // Just for complete clarity
    testState.advanceState();
}

function stateMachine() {
    // Object prototype for tracking and managing the test state

    function pickSubPool(pool, numElements) {
        // Assumes each element of pool has function "alwaysInclude"

        // First extract those excluded from picking process
        var picked = [];
        pool.forEach(function (e, i) {
            if (e.alwaysInclude) {
                picked.push(pool.splice(i, 1)[0]);
            }
        });

        return picked.concat(randomSubArray(pool, numElements - picked.length));
    }

    this.stateMap = [];
    this.preTestSurvey = null;
    this.postTestSurvey = null;
    this.stateIndex = null;
    this.currentStateMap = null;
    this.currentStatePosition = null;
    this.currentStore = null;
    this.initialise = function () {

        function randomiseElements(page) {
            // Get the elements which are fixed / labelled
            var fixed = [],
                or = [],
                remainder = [];
            page.audioElements.forEach(function (a) {
                if (a.label.length > 0 || a.postion !== undefined) {
                    fixed.push(a);
                } else if (a.type === "outside-reference") {
                    or.push(a);
                } else {
                    remainder.push(a);
                }
            });
            if (page.poolSize > 0 || page.randomiseOrder) {
                page.randomiseOrder = true;
                if (page.poolSize === 0) {
                    page.poolSize = page.audioElements.length;
                }
                page.poolSize -= fixed.length;
                remainder = pickSubPool(remainder, page.poolSize);
            }
            // Randomise the remainders
            if (page.randomiseOrder) {
                remainder = randomiseOrder(remainder);
            }
            fixed = fixed.concat(remainder);
            page.audioElements = fixed.concat(or);
            page.audioElements.forEach(function (a, i) {
                a.position = i;
            });
        }

        // Get the data from Specification
        var pagePool = [];
        specification.pages.forEach(function (page) {
            if (page.position !== null || page.alwaysInclude) {
                page.alwaysInclude = true;
            }
            pagePool.push(page);
        });
        if (specification.numPages > 0) {
            specification.randomiseOrder = true;
            pagePool = pickSubPool(pagePool, specification.numPages);
        }

        // Now get the order of pages
        var fixed = [];
        pagePool.forEach(function (page) {
            if (page.position !== undefined) {
                fixed.push(page);
                var i = pagePool.indexOf(page);
                pagePool.splice(i, 1);
            }
        });

        if (specification.randomiseOrder) {
            pagePool = randomiseOrder(pagePool);
        }

        // Place in the correct order
        fixed.forEach(function (page) {
            pagePool.splice(page.position, 0, page);
        });

        // Now process the pages
        pagePool.forEach(function (page, i) {
            page.presentedId = i;
            this.stateMap.push(page);
            var elements = page.audioElements;
            randomiseElements(page);
            storage.createTestPageStore(page);
            audioEngineContext.loadPageData(page);
        }, this);

        if (specification.preTest !== null) {
            this.preTestSurvey = specification.preTest;
        }
        if (specification.postTest !== null) {
            this.postTestSurvey = specification.postTest;
        }

        if (this.stateMap.length > 0) {
            if (this.stateIndex !== null) {
                console.log('NOTE - State already initialise');
            }
            this.stateIndex = -2;
            console.log('Starting test...');
        } else {
            console.log('FATAL - StateMap not correctly constructed. EMPTY_STATE_MAP');
        }
    };
    this.advanceState = function () {
        if (this.stateIndex === null) {
            this.initialise();
        }
        if (this.stateIndex > -2) {
            storage.update();
        }
        if (this.stateIndex == -2) {
            this.stateIndex++;
            if (this.preTestSurvey !== undefined) {
                popup.initState(this.preTestSurvey, storage.globalPreTest);
            } else {
                this.advanceState();
            }
        } else if (this.stateIndex == -1) {
            if (interfaceContext.calibrationTests.checkFrequencies) {
                popup.showPopup();
                popup.popupTitle.textContent = "Set the levels so all tones are of equal amplitude. Move your mouse over the sliders to hear the tones. The red slider is the reference tone";
                interfaceContext.calibrationTests.performFrequencyCheck(popup.popupResponse);
                popup.hidePreviousButton();
            } else if (interfaceContext.calibrationTests.checkChannels) {
                popup.showPopup();
                popup.popupTitle.textContent = "Click play to start the audio, the click the button corresponding to where the sound appears to be coming from.";
                interfaceContext.calibrationTests.performChannelCheck(popup.popupResponse);
                popup.hidePreviousButton();
            } else {
                this.stateIndex++;
                this.advanceState();
            }
        } else if (this.stateIndex == this.stateMap.length) {
            // All test pages complete, post test
            console.log('Ending test ...');
            this.stateIndex++;
            if (this.postTestSurvey === undefined) {
                this.advanceState();
            } else {
                popup.initState(this.postTestSurvey, storage.globalPostTest);
            }
        } else if (this.stateIndex > this.stateMap.length) {
            createProjectSave(specification.projectReturn);
        } else {
            popup.hidePopup();
            if (this.currentStateMap === null) {
                this.currentStateMap = this.stateMap[this.stateIndex];

                this.currentStore = storage.testPages[this.stateIndex];
                if (this.currentStateMap.preTest !== undefined) {
                    this.currentStatePosition = 'pre';
                    popup.initState(this.currentStateMap.preTest, storage.testPages[this.stateIndex].preTest);
                } else {
                    this.currentStatePosition = 'test';
                }
                interfaceContext.newPage(this.currentStateMap, storage.testPages[this.stateIndex]);
                return;
            }
            switch (this.currentStatePosition) {
                case 'pre':
                    this.currentStatePosition = 'test';
                    break;
                case 'test':
                    this.currentStatePosition = 'post';
                    // Save the data
                    this.testPageCompleted();
                    if (this.currentStateMap.postTest === undefined) {
                        this.advanceState();
                        return;
                    } else {
                        popup.initState(this.currentStateMap.postTest, storage.testPages[this.stateIndex].postTest);
                    }
                    break;
                case 'post':
                    this.stateIndex++;
                    this.currentStateMap = null;
                    this.advanceState();
                    break;
            }
        }
    };

    this.testPageCompleted = function () {
        // Function called each time a test page has been completed
        var storePoint = storage.testPages[this.stateIndex];
        // First get the test metric

        var metric = storePoint.XMLDOM.getElementsByTagName('metric')[0];
        if (audioEngineContext.metric.enableTestTimer) {
            var testTime = storePoint.parent.document.createElement('metricresult');
            testTime.id = 'testTime';
            testTime.textContent = audioEngineContext.timer.testDuration;
            metric.appendChild(testTime);
        }

        var audioObjects = audioEngineContext.audioObjects;
        audioEngineContext.audioObjects.forEach(function (ao) {
            ao.exportXMLDOM();
        });
        interfaceContext.commentQuestions.forEach(function (element) {
            element.exportXMLDOM(storePoint);
        });
        pageXMLSave(storePoint.XMLDOM, this.currentStateMap);
        storePoint.complete();
    };

    this.getCurrentTestPage = function () {
        if (this.stateIndex >= 0 && this.stateIndex < this.stateMap.length) {
            return this.currentStateMap;
        } else {
            return null;
        }
    };
    this.getCurrentTestPageStore = function () {
        if (this.stateIndex >= 0 && this.stateIndex < this.stateMap.length) {
            return this.currentStore;
        } else {
            return null;
        }
    };
}

function AudioEngine(specification) {

    // Create two output paths, the main outputGain and fooGain.
    // Output gain is default to 1 and any items for playback route here
    // Foo gain is used for analysis to ensure paths get processed, but are not heard
    // because web audio will optimise and any route which does not go to the destination gets ignored.
    this.outputGain = audioContext.createGain();
    this.fooGain = audioContext.createGain();
    this.fooGain.gain.value = 0;

    // Use this to detect playback state: 0 - stopped, 1 - playing
    this.status = 0;

    // Connect both gains to output
    this.outputGain.connect(audioContext.destination);
    this.fooGain.connect(audioContext.destination);

    // Create the timer Object
    this.timer = new timer();
    // Create session metrics
    this.metric = new sessionMetrics(this, specification);

    this.loopPlayback = false;
    this.synchPlayback = false;
    this.pageSpecification = null;

    this.pageStore = null;

    // Chrome 53+ Error solution
    // Empty buffer for keep-alive
    var nullBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    this.nullBufferSource = audioContext.createBufferSource();
    this.nullBufferSource.buffer = nullBuffer;
    this.nullBufferSource.loop = true;
    this.nullBufferSource.start(0);

    // Create store for new audioObjects
    this.audioObjects = [];

    this.buffers = [];
    this.bufferObj = function () {
        var urls = [];
        this.buffer = null;
        this.users = [];
        this.progress = 0;
        this.status = 0;
        this.ready = function () {
            if (this.status >= 2) {
                this.status = 3;
            }
            for (var i = 0; i < this.users.length; i++) {
                this.users[i].state = 1;
                if (this.users[i].interfaceDOM !== null) {
                    this.users[i].bufferLoaded(this);
                }
            }
        };
        this.setUrls = function (obj) {
            // Obj must be an array of pairs:
            // [{sampleRate, url}]
            var localFs = audioContext.sampleRate,
                list = [],
                i;
            for (i = 0; i < obj.length; i++) {
                if (obj[i].sampleRate == localFs) {
                    list.push(obj.splice(i, 1)[0]);
                }
            }
            list = list.concat(obj);
            urls = list;
        };
        this.hasUrl = function (checkUrl) {
            var l = urls.length,
                i;
            for (i = 0; i < l; i++) {
                if (urls[i].url == checkUrl) {
                    return true;
                }
            }
            return false;
        };
        this.getMedia = function () {
            var self = this;
            var currentUrlIndex = 0;

            function get(fqurl) {
                return new Promise(function (resolve, reject) {
                    var req = new XMLHttpRequest();
                    req.open('GET', fqurl, true);
                    req.responseType = 'arraybuffer';
                    req.onload = function () {
                        if (req.status == 200) {
                            resolve(req.response);
                        }
                    };
                    req.onerror = function () {
                        reject(new Error(req.statusText));
                    };

                    req.addEventListener("progress", progressCallback.bind(self));
                    req.send();
                });
            }

            function getNextURL() {
                currentUrlIndex++;
                var self = this;
                if (currentUrlIndex >= urls.length) {
                    processError();
                } else {
                    return get(urls[currentUrlIndex].url).then(processAudio.bind(self)).catch(getNextURL.bind(self));
                }
            }

            // Create callback to decode the data asynchronously
            function processAudio(response) {
                var self = this;
                return audioContext.decodeAudioData(response, function (decodedData) {
                    self.buffer = decodedData;
                    self.status = 2;
                    calculateLoudness(self, "I");
                    return true;
                }, function (e) {
                    var waveObj = new WAVE();
                    if (waveObj.open(response) === 0) {
                        self.buffer = audioContext.createBuffer(waveObj.num_channels, waveObj.num_samples, waveObj.sample_rate);
                        for (var c = 0; c < waveObj.num_channels; c++) {
                            var buffer_ptr = self.buffer.getChannelData(c);
                            for (var n = 0; n < waveObj.num_samples; n++) {
                                buffer_ptr[n] = waveObj.decoded_data[c][n];
                            }
                        }
                    }
                    if (self.buffer !== undefined) {
                        self.status = 2;
                        calculateLoudness(self, "I");
                        return true;
                    }
                    waveObj = undefined;
                    return false;
                });
            }

            // Create callback for any error in loading
            function processError() {
                this.status = -1;
                for (var i = 0; i < this.users.length; i++) {
                    this.users[i].state = -1;
                    if (this.users[i].interfaceDOM !== null) {
                        this.users[i].bufferLoaded(this);
                    }
                }
                interfaceContext.lightbox.post("Error", "Could not load resource " + urls[currentUrlIndex].url);
            }

            function progressCallback(event) {
                if (event.lengthComputable) {
                    this.progress = event.loaded / event.total;
                    for (var i = 0; i < this.users.length; i++) {
                        if (this.users[i].interfaceDOM !== null) {
                            if (typeof this.users[i].interfaceDOM.updateLoading === "function") {
                                this.users[i].interfaceDOM.updateLoading(this.progress * 100);
                            }
                        }
                    }
                }
            }

            this.progress = 0;
            this.status = 1;
            currentUrlIndex = 0;
            get(urls[0].url).then(processAudio.bind(self)).catch(getNextURL.bind(self));
        };

        this.registerAudioObject = function (audioObject) {
            // Called by an audioObject to register to the buffer for use
            // First check if already in the register pool
            this.users.forEach(function (object) {
                if (audioObject.id == object.id) {
                    return 0;
                }
            });
            this.users.push(audioObject);
            if (this.status == 3 || this.status == -1) {
                // The buffer is already ready, trigger bufferLoaded
                audioObject.bufferLoaded(this);
            }
        };

        this.copyBuffer = function (preSilenceTime, postSilenceTime) {
            // Copies the entire bufferObj.
            if (preSilenceTime === undefined) {
                preSilenceTime = 0;
            }
            if (postSilenceTime === undefined) {
                postSilenceTime = 0;
            }
            var preSilenceSamples = secondsToSamples(preSilenceTime, this.buffer.sampleRate);
            var postSilenceSamples = secondsToSamples(postSilenceTime, this.buffer.sampleRate);
            var newLength = this.buffer.length + preSilenceSamples + postSilenceSamples;
            var copybuffer = audioContext.createBuffer(this.buffer.numberOfChannels, newLength, this.buffer.sampleRate);
            var c;
            // Now we can use some efficient background copy schemes if we are just padding the end
            if (preSilenceSamples === 0 && typeof copybuffer.copyToChannel === "function") {
                for (c = 0; c < this.buffer.numberOfChannels; c++) {
                    copybuffer.copyToChannel(this.buffer.getChannelData(c), c);
                }
            } else {
                for (c = 0; c < this.buffer.numberOfChannels; c++) {
                    var src = this.buffer.getChannelData(c);
                    var dst = copybuffer.getChannelData(c);
                    for (var n = 0; n < src.length; n++)
                        dst[n + preSilenceSamples] = src[n];
                }
            }
            // Copy in the rest of the buffer information
            copybuffer.lufs = this.buffer.lufs;
            copybuffer.playbackGain = this.buffer.playbackGain;
            return copybuffer;
        };

        this.cropBuffer = function (startTime, stopTime) {
            // Copy and return the cropped buffer
            var start_sample = Math.floor(startTime * this.buffer.sampleRate);
            var stop_sample = Math.floor(stopTime * this.buffer.sampleRate);
            var newLength = stop_sample - start_sample;
            var copybuffer = audioContext.createBuffer(this.buffer.numberOfChannels, newLength, this.buffer.sampleRate);
            // Now we can use some efficient background copy schemes if we are just padding the end
            for (var c = 0; c < this.buffer.numberOfChannels; c++) {
                var buffer = this.buffer.getChannelData(c);
                var sub_frame = buffer.subarray(start_sample, stop_sample);
                if (typeof copybuffer.copyToChannel == "function") {
                    copybuffer.copyToChannel(sub_frame, c);
                } else {
                    var dst = copybuffer.getChannelData(c);
                    for (var n = 0; n < newLength; n++)
                        dst[n] = buffer[n + start_sample];
                }
            }
            return copybuffer;
        };
    };

    this.loadPageData = function (page) {
        // Load the URL from pages
        function loadAudioElementData(element) {
            var URL = page.hostURL + element.url;
            var buffer = this.buffers.find(function (buffObj) {
                return buffObj.hasUrl(URL);
            });
            if (buffer === undefined) {
                buffer = new this.bufferObj();
                var urls = [{
                    url: URL,
                    sampleRate: element.sampleRate
                }];
                element.alternatives.forEach(function (e) {
                    urls.push({
                        url: e.url,
                        sampleRate: e.sampleRate
                    });
                });
                buffer.setUrls(urls);
                buffer.getMedia();
                this.buffers.push(buffer);
            }
        }
        page.audioElements.forEach(loadAudioElementData, this);
    };

    function playNormal(id) {
        var playTime = audioContext.currentTime + 0.1;
        var stopTime = playTime + specification.crossFade;
        this.audioObjects.forEach(function (ao) {
            if (ao.id === id) {
                ao.setupPlayback();
                ao.bufferStart(playTime);
                ao.listenStart(playTime);
            } else {
                ao.listenStop(playTime);
                ao.bufferStop(stopTime);
            }
        });
    }

    function playSync(id) {
        var playTime = audioContext.currentTime + 0.1;
        var stopTime = playTime + specification.crossFade;
        this.audioObjects.forEach(function (ao) {
            ao.setupPlayback();
            ao.bufferStart(playTime);
            if (ao.id === id) {
                ao.listenStart(playTime);
            } else {
                ao.listenStop(playTime);
            }
        });
    }

    this.play = function (id) {
        // Start the timer and set the audioEngine state to playing (1)
        if (typeof id !== "number" || id < 0 || id > this.audioObjects.length) {
            throw ('FATAL - Passed id was undefined - AudioEngineContext.play(id)');
        }
        var maxPlays = this.audioObjects[id].specification.maxNumberPlays || this.audioObjects[id].specification.parent.maxNumberPlays || specification.maxNumberPlays;
        if (maxPlays !== undefined && this.audioObjects[id].numberOfPlays >= maxPlays) {
            interfaceContext.lightbox.post("Error", "Cannot play this fragment more than " + maxPlays + " times");
            return;
        }
        if (this.status === 1) {
            this.timer.startTest();
            interfaceContext.playhead.setTimePerPixel(this.audioObjects[id]);
            if (this.synchPlayback) {
                // Traditional looped playback
                playSync.call(this, id);
            } else {
                if (this.bufferReady(id) === false) {
                    console.log("Cannot play. Buffer not ready");
                    return;
                }
                playNormal.call(this, id);
            }
            interfaceContext.playhead.start();
        }
    };

    this.stop = function () {
        // Send stop and reset command to all playback buffers
        if (this.status == 1) {
            var setTime = audioContext.currentTime + 0.1;
            this.audioObjects.forEach(function (a) {
                a.listenStop(setTime);
                a.bufferStop(setTime);
            });
            interfaceContext.playhead.stop();
        }
    };

    this.newTrack = function (element) {
        // Pull data from given URL into new audio buffer
        // URLs must either be from the same source OR be setup to 'Access-Control-Allow-Origin'

        // Create the audioObject with ID of the new track length;
        var audioObjectId = this.audioObjects.length;
        this.audioObjects[audioObjectId] = new audioObject(audioObjectId);

        // Check if audioObject buffer is currently stored by full URL
        var URL = testState.currentStateMap.hostURL + element.url;
        var buffer = this.buffers.find(function (buffObj) {
            return buffObj.hasUrl(URL);
        });
        if (buffer === undefined) {
            console.log("[WARN]: Buffer was not loaded in pre-test! " + URL);
            buffer = new this.bufferObj();
            this.buffers.push(buffer);
            buffer.getMedia(URL);
        }
        this.audioObjects[audioObjectId].specification = element;
        this.audioObjects[audioObjectId].url = URL;
        // Obtain store node
        var aeNodes = this.pageStore.XMLDOM.getElementsByTagName('audioelement');
        for (var i = 0; i < aeNodes.length; i++) {
            if (aeNodes[i].getAttribute("ref") == element.id) {
                this.audioObjects[audioObjectId].storeDOM = aeNodes[i];
                break;
            }
        }
        buffer.registerAudioObject(this.audioObjects[audioObjectId]);
        return this.audioObjects[audioObjectId];
    };

    this.newTestPage = function (audioHolderObject, store) {
        this.pageStore = store;
        this.pageSpecification = audioHolderObject;
        this.status = 0;
        this.audioObjectsReady = false;
        this.metric.reset();
        this.buffers.forEach(function (buffer) {
            buffer.users = [];
        });
        this.audioObjects = [];
        this.timer = new timer();
        this.loopPlayback = audioHolderObject.loop;
        this.synchPlayback = audioHolderObject.synchronous;
        interfaceContext.keyboardInterface.resetKeyBindings();
    };

    this.checkAllPlayed = function () {
        var arr = [];
        for (var id = 0; id < this.audioObjects.length; id++) {
            if (this.audioObjects[id].metric.wasListenedTo === false) {
                arr.push(this.audioObjects[id].id);
            }
        }
        return arr;
    };

    this.checkAllReady = function () {
        var ready = true;
        for (var i = 0; i < this.audioObjects.length; i++) {
            if (this.audioObjects[i].state === 0) {
                // Track not ready
                console.log('WAIT -- audioObject ' + i + ' not ready yet!');
                ready = false;
            }
        }
        return ready;
    };

    this.setSynchronousLoop = function () {
        // Pads the signals so they are all exactly the same duration
        // Get the duration of the longest signal.
        var duration = 0;
        var maxId;
        for (var i = 0; i < this.audioObjects.length; i++) {
            if (duration < this.audioObjects[i].buffer.buffer.duration) {
                duration = this.audioObjects[i].buffer.buffer.duration;
                maxId = i;
            }
        }
        // Extract the audio and zero-pad
        this.audioObjects.forEach(function (ao) {
            if (ao.buffer.buffer.duration !== duration) {
                ao.buffer.buffer = ao.buffer.copyBuffer(0, duration - ao.buffer.buffer.duration);
            }
        });
    };

    this.bufferReady = function (id) {
        if (this.checkAllReady()) {
            if (this.synchPlayback) {
                this.setSynchronousLoop();
            }
            this.status = 1;
            return true;
        }
        return false;
    };

}

function audioObject(id) {
    // The main buffer object with common control nodes to the AudioEngine

    var playCounter = 0;

    this.specification = undefined;
    this.id = id;
    this.state = 0; // 0 - no data, 1 - ready
    this.url = null; // Hold the URL given for the output back to the results.
    this.metric = new metricTracker(this);
    this.storeDOM = null;
    this.playing = false;

    // Bindings for GUI
    this.interfaceDOM = null;
    this.commentDOM = null;

    // Create a buffer and external gain control to allow internal patching of effects and volume leveling.
    this.bufferNode = undefined;
    this.outputGain = audioContext.createGain();
    this.outputGain.gain.value = 0.0;

    this.onplayGain = 1.0;

    // Connect buffer to the audio graph
    this.outputGain.connect(audioEngineContext.outputGain);
    audioEngineContext.nullBufferSource.connect(this.outputGain);

    // the audiobuffer is not designed for multi-start playback
    // When stopeed, the buffer node is deleted and recreated with the stored buffer.
    this.buffer = undefined;

    this.bufferLoaded = function (callee) {
        // Called by the associated buffer when it has finished loading, will then 'bind' the buffer to the
        // audioObject and trigger the interfaceDOM.enable() function for user feedback
        if (callee.status == -1) {
            // ERROR
            this.state = -1;
            if (this.interfaceDOM !== null) {
                this.interfaceDOM.error();
            }
            this.buffer = callee;
            return;
        }
        this.buffer = callee;
        var preSilenceTime = this.specification.preSilence || this.specification.parent.preSilence || specification.preSilence || 0.0;
        var postSilenceTime = this.specification.postSilence || this.specification.parent.postSilence || specification.postSilence || 0.0;
        var startTime = this.specification.startTime;
        var stopTime = this.specification.stopTime;
        var copybuffer = new callee.constructor();

        copybuffer.buffer = callee.cropBuffer(startTime || 0, stopTime || callee.buffer.duration);
        if (preSilenceTime !== 0 || postSilenceTime !== 0) {
            copybuffer.buffer = copybuffer.copyBuffer(preSilenceTime, postSilenceTime);
        }

        copybuffer.buffer.lufs = callee.buffer.lufs;
        this.buffer = copybuffer;

        var targetLUFS = this.specification.loudness || this.specification.parent.loudness || specification.loudness;
        if (typeof targetLUFS === "number" && isFinite(targetLUFS)) {
            this.buffer.buffer.playbackGain = decibelToLinear(targetLUFS - this.buffer.buffer.lufs);
        } else {
            this.buffer.buffer.playbackGain = 1.0;
        }
        if (this.interfaceDOM !== null) {
            this.interfaceDOM.enable();
        }
        this.onplayGain = decibelToLinear(this.specification.gain) * (this.buffer.buffer.playbackGain || 1.0);
        this.storeDOM.setAttribute('playGain', linearToDecibel(this.onplayGain));
        this.state = 1;
        audioEngineContext.bufferReady(id);
    };

    this.bindInterface = function (interfaceObject) {
        this.interfaceDOM = interfaceObject;
        this.metric.initialise(interfaceObject.getValue());
        if (this.state == 1) {
            this.interfaceDOM.enable();
        } else if (this.state == -1) {
            // ERROR
            this.interfaceDOM.error();
            return;
        }
        var presentedId = interfaceObject.getPresentedId();
        this.storeDOM.setAttribute('presentedId', presentedId);

        // Key-bindings
        if (presentedId.length == 1) {
            interfaceContext.keyboardInterface.registerKeyBinding(presentedId, this);
        }
    };

    this.listenStart = function (setTime) {
        if (this.playing === false) {
            playCounter++;
            this.outputGain.gain.linearRampToValueAtTime(this.onplayGain, setTime);
            this.metric.startListening(audioEngineContext.timer.getTestTime());
            this.bufferNode.playbackStartTime = audioEngineContext.timer.getTestTime();
            this.interfaceDOM.startPlayback();
            this.playing = true;
        }
    };

    this.listenStop = function (setTime) {
        if (this.playing === true) {
            this.outputGain.gain.linearRampToValueAtTime(0.0, setTime);
            this.metric.stopListening(audioEngineContext.timer.getTestTime(), this.getCurrentPosition());
        }
        this.interfaceDOM.stopPlayback();
        this.playing = false;
    };

    this.setupPlayback = function () {
        if (this.bufferNode === undefined && this.buffer.buffer !== undefined) {
            this.bufferNode = audioContext.createBufferSource();
            this.bufferNode.owner = this;
            this.bufferNode.connect(this.outputGain);
            this.bufferNode.buffer = this.buffer.buffer;
            if (audioEngineContext.loopPlayback) {
                this.bufferNode.loopStart = this.specification.startTime || 0;
                this.bufferNode.loopEnd = this.specification.stopTime - this.specification.startTime || this.buffer.buffer.duration;
                this.bufferNode.loop = true;
            }
            this.bufferNode.onended = function (event) {
                // Safari does not like using 'this' to reference the calling object!
                //event.currentTarget.owner.metric.stopListening(audioEngineContext.timer.getTestTime(),event.currentTarget.owner.getCurrentPosition());
                if (event.currentTarget !== null) {
                    event.currentTarget.owner.bufferStop(audioContext.currentTime + 0.1);
                    event.currentTarget.owner.listenStop(audioContext.currentTime + 0.1);
                }
            };
            this.bufferNode.state = 0;
        }
    };

    this.bufferStart = function (startTime) {
        this.outputGain.gain.cancelScheduledValues(audioContext.currentTime);
        if (this.bufferNode && this.bufferNode.state === 0) {
            this.bufferNode.state = 1;
            if (this.bufferNode.loop === true) {
                this.bufferNode.start(startTime);
            } else {
                this.bufferNode.start(startTime, this.specification.startTime || 0, this.specification.stopTime - this.specification.startTime || this.buffer.buffer.duration);
            }
        }
    };

    this.bufferStop = function (stopTime) {
        this.outputGain.gain.cancelScheduledValues(audioContext.currentTime);
        if (this.bufferNode !== undefined && this.bufferNode.state > 0) {
            this.bufferNode.stop(stopTime);
            this.bufferNode = undefined;
        }
        this.outputGain.gain.linearRampToValueAtTime(0.0, stopTime);
        this.interfaceDOM.stopPlayback();
    };

    this.getCurrentPosition = function () {
        var time = audioEngineContext.timer.getTestTime();
        if (this.bufferNode !== undefined) {
            var position = (time - this.bufferNode.playbackStartTime) % this.buffer.buffer.duration;
            if (isNaN(position)) {
                return 0;
            }
            return position;
        } else {
            return 0;
        }
    };

    this.exportXMLDOM = function () {
        var file = storage.document.createElement('file');
        file.setAttribute('sampleRate', this.buffer.buffer.sampleRate);
        file.setAttribute('channels', this.buffer.buffer.numberOfChannels);
        file.setAttribute('sampleCount', this.buffer.buffer.length);
        file.setAttribute('duration', this.buffer.buffer.duration);
        this.storeDOM.appendChild(file);
        if (this.specification.type != 'outside-reference') {
            var interfaceXML = this.interfaceDOM.exportXMLDOM(this);
            if (interfaceXML !== null) {
                if (interfaceXML.length === undefined) {
                    this.storeDOM.appendChild(interfaceXML);
                } else {
                    for (var i = 0; i < interfaceXML.length; i++) {
                        this.storeDOM.appendChild(interfaceXML[i]);
                    }
                }
            }
            if (this.commentDOM !== null) {
                this.storeDOM.appendChild(this.commentDOM.exportXMLDOM(this));
            }
        }
        this.metric.exportXMLDOM(this.storeDOM.getElementsByTagName('metric')[0]);
    };

    Object.defineProperties(this, {
        "numberOfPlays": {
            'get': function () {
                return playCounter;
            },
            'set': function () {
                return playCounter;
            }
        }
    });
}

function timer() {
    /* Timer object used in audioEngine to keep track of session timings
     * Uses the timer of the web audio API, so sample resolution
     */
    this.testStarted = false;
    this.testStartTime = 0;
    this.testDuration = 0;
    this.minimumTestTime = 0; // No minimum test time
    this.startTest = function () {
        if (this.testStarted === false) {
            this.testStartTime = audioContext.currentTime;
            this.testStarted = true;
            this.updateTestTime();
            audioEngineContext.metric.initialiseTest();
        }
    };
    this.stopTest = function () {
        if (this.testStarted) {
            this.testDuration = this.getTestTime();
            this.testStarted = false;
        } else {
            console.log('ERR: Test tried to end before beginning');
        }
    };
    this.updateTestTime = function () {
        if (this.testStarted) {
            this.testDuration = audioContext.currentTime - this.testStartTime;
        }
    };
    this.getTestTime = function () {
        this.updateTestTime();
        return this.testDuration;
    };
}

function sessionMetrics(engine, specification) {
    /* Used by audioEngine to link to audioObjects to minimise the timer call timers;
     */
    this.engine = engine;
    this.lastClicked = -1;
    this.data = -1;
    this.reset = function () {
        this.lastClicked = -1;
        this.data = -1;
    };

    this.enableElementInitialPosition = false;
    this.enableElementListenTracker = false;
    this.enableElementTimer = false;
    this.enableElementTracker = false;
    this.enableFlagListenedTo = false;
    this.enableFlagMoved = false;
    this.enableTestTimer = false;
    // Obtain the metrics enabled
    for (var i = 0; i < specification.metrics.enabled.length; i++) {
        var node = specification.metrics.enabled[i];
        switch (node) {
            case 'testTimer':
                this.enableTestTimer = true;
                break;
            case 'elementTimer':
                this.enableElementTimer = true;
                break;
            case 'elementTracker':
                this.enableElementTracker = true;
                break;
            case 'elementListenTracker':
                this.enableElementListenTracker = true;
                break;
            case 'elementInitialPosition':
                this.enableElementInitialPosition = true;
                break;
            case 'elementFlagListenedTo':
                this.enableFlagListenedTo = true;
                break;
            case 'elementFlagMoved':
                this.enableFlagMoved = true;
                break;
            case 'elementFlagComments':
                this.enableFlagComments = true;
                break;
        }
    }
    this.initialiseTest = function () {};
}

function metricTracker(caller) {
    /* Custom object to track and collect metric data
     * Used only inside the audioObjects object.
     */

    this.listenedTimer = 0;
    this.listenStart = 0;
    this.listenHold = false;
    this.initialPosition = -1;
    this.movementTracker = [];
    this.listenTracker = [];
    this.wasListenedTo = false;
    this.wasMoved = false;
    this.hasComments = false;
    this.parent = caller;

    this.initialise = function (position) {
        if (this.initialPosition == -1) {
            this.initialPosition = position;
            this.moved(0, position);
        }
    };

    this.moved = function (time, position) {
        var last;
        if (time > 0) {
            this.wasMoved = true;
        }
        // Get the last entry
        if (this.movementTracker.length > 0) {
            last = this.movementTracker[this.movementTracker.length - 1];
        } else {
            last = -1;
        }
        if (position != last[1]) {
            this.movementTracker[this.movementTracker.length] = [time, position];
        }
    };

    this.startListening = function (time) {
        if (this.listenHold === false) {
            this.wasListenedTo = true;
            this.listenStart = time;
            this.listenHold = true;

            var evnt = document.createElement('event');
            var testTime = document.createElement('testTime');
            testTime.setAttribute('start', time);
            var bufferTime = document.createElement('bufferTime');
            bufferTime.setAttribute('start', this.parent.getCurrentPosition());
            evnt.appendChild(testTime);
            evnt.appendChild(bufferTime);
            this.listenTracker.push(evnt);

            console.log('slider ' + this.parent.id + ' played (' + time + ')'); // DEBUG/SAFETY: show played slider id
        }
    };

    this.stopListening = function (time, bufferStopTime) {
        if (this.listenHold === true) {
            var diff = time - this.listenStart;
            this.listenedTimer += (diff);
            this.listenStart = 0;
            this.listenHold = false;

            var evnt = this.listenTracker[this.listenTracker.length - 1];
            var testTime = evnt.getElementsByTagName('testTime')[0];
            var bufferTime = evnt.getElementsByTagName('bufferTime')[0];
            testTime.setAttribute('stop', time);
            if (bufferStopTime === undefined) {
                bufferTime.setAttribute('stop', this.parent.getCurrentPosition());
            } else {
                bufferTime.setAttribute('stop', bufferStopTime);
            }
            console.log('slider ' + this.parent.id + ' played for (' + diff + ')'); // DEBUG/SAFETY: show played slider id
        }
    };

    function exportElementTimer(parentElement) {
        var mElementTimer = storage.document.createElement('metricresult');
        mElementTimer.setAttribute('name', 'enableElementTimer');
        mElementTimer.textContent = this.listenedTimer;
        parentElement.appendChild(mElementTimer);
        return mElementTimer;
    }

    function exportElementTrack(parentElement) {
        var elementTrackerFull = storage.document.createElement('metricresult');
        elementTrackerFull.setAttribute('name', 'elementTrackerFull');
        for (var k = 0; k < this.movementTracker.length; k++) {
            var timePos = storage.document.createElement('movement');
            timePos.setAttribute("time", this.movementTracker[k][0]);
            timePos.setAttribute("value", this.movementTracker[k][1]);
            elementTrackerFull.appendChild(timePos);
        }
        parentElement.appendChild(elementTrackerFull);
        return elementTrackerFull;
    }

    function exportElementListenTracker(parentElement) {
        var elementListenTracker = storage.document.createElement('metricresult');
        elementListenTracker.setAttribute('name', 'elementListenTracker');
        for (var k = 0; k < this.listenTracker.length; k++) {
            elementListenTracker.appendChild(this.listenTracker[k]);
        }
        parentElement.appendChild(elementListenTracker);
        return elementListenTracker;
    }

    function exportElementInitialPosition(parentElement) {
        var elementInitial = storage.document.createElement('metricresult');
        elementInitial.setAttribute('name', 'elementInitialPosition');
        elementInitial.textContent = this.initialPosition;
        parentElement.appendChild(elementInitial);
        return elementInitial;
    }

    function exportFlagListenedTo(parentElement) {
        var flagListenedTo = storage.document.createElement('metricresult');
        flagListenedTo.setAttribute('name', 'elementFlagListenedTo');
        flagListenedTo.textContent = this.wasListenedTo;
        parentElement.appendChild(flagListenedTo);
        return flagListenedTo;
    }

    function exportFlagMoved(parentElement) {
        var flagMoved = storage.document.createElement('metricresult');
        flagMoved.setAttribute('name', 'elementFlagMoved');
        flagMoved.textContent = this.wasMoved;
        parentElement.appendChild(flagMoved);
        return flagMoved;
    }

    function exportFlagComments(parentElement) {
        var flagComments = storage.document.createElement('metricresult');
        flagComments.setAttribute('name', 'elementFlagComments');
        if (this.parent.commentDOM === null) {
            flagComments.textContent = 'false';
        } else if (this.parent.commentDOM.textContent.length === 0) {
            flagComments.textContent = 'false';
        } else {
            flagComments.textContet = 'true';
        }
        parentElement.appendChild(flagComments);
        return flagComments;
    }

    this.exportXMLDOM = function (parentElement) {
        var elems = [];
        if (audioEngineContext.metric.enableElementTimer) {
            elems.push(exportElementTimer.call(this, parentElement));
        }
        if (audioEngineContext.metric.enableElementTracker) {
            elems.push(exportElementTrack.call(this, parentElement));
        }
        if (audioEngineContext.metric.enableElementListenTracker) {
            elems.push(exportElementListenTracker.call(this, parentElement));
        }
        if (audioEngineContext.metric.enableElementInitialPosition) {
            elems.push(exportElementInitialPosition.call(this, parentElement));
        }
        if (audioEngineContext.metric.enableFlagListenedTo) {
            elems.push(exportFlagListenedTo.call(this, parentElement));
        }
        if (audioEngineContext.metric.enableFlagMoved) {
            elems.push(exportFlagMoved.call(this, parentElement));
        }
        if (audioEngineContext.metric.enableFlagComments) {
            elems.push(exportFlagComments.call(this, parentElement));
        }
        return elems;
    };
}

function Interface(specificationObject) {
    // This handles the bindings between the interface and the audioEngineContext;
    this.specification = specificationObject;
    this.insertPoint = document.getElementById("topLevelBody");

    this.newPage = function (audioHolderObject, store) {
        audioEngineContext.newTestPage(audioHolderObject, store);
        interfaceContext.commentBoxes.deleteCommentBoxes();
        interfaceContext.deleteCommentQuestions();
        loadTest(audioHolderObject, store);
    };

    this.keyboardInterface = (function () {
        var keyboardInterfaceController = {
            keys: [],
            registerKeyBinding: function (key, audioObject) {
                if (typeof key != "string" || key.length != 1) {
                    throw ("Key must be a singular character");
                }
                var included = this.keys.findIndex(function (k) {
                    return k.key == key;
                }) >= 0;
                if (included) {
                    throw ("Key " + key + " already bounded!");
                }
                this.keys.push({
                    key: key,
                    audioObject: audioObject
                });
                return true;
            },
            deregisterKeyBinding: function (key) {
                var index = this.keys.findIndex(function (k) {
                    return k.key == key;
                });
                if (index == -1) {
                    throw ("Key " + key + " not bounded!");
                }
                this.keys.splice(index, 1);
                return true;
            },
            resetKeyBindings: function () {
                this.keys = [];
            },
            handleEvent: function (e) {
                function isPlaying() {
                    return audioEngineContext.audioObjects.some(function (a) {
                        return a.playing;
                    });
                }

                function keypress(key) {
                    var index = this.keys.findIndex(function (k) {
                        return k.key == key;
                    });
                    if (index >= 0) {
                        audioEngineContext.play(this.keys[index].audioObject.id);
                    }
                }

                function trackCommentFocus() {
                    return document.activeElement.className.indexOf("trackComment") >= 0;
                }
                if (testState.currentStatePosition != "test") {
                    return;
                }
                if (trackCommentFocus()) {
                    return;
                }
                if (e.key === " ") {
                    if (isPlaying()) {
                        e.preventDefault();
                        audioEngineContext.stop();
                    }
                } else {
                    keypress.call(this, e.key);
                }
            }
        };
        document.addEventListener("keydown", keyboardInterfaceController, false);
        return keyboardInterfaceController;
    })();

    // Bounded by interface!!
    // Interface object MUST have an exportXMLDOM method which returns the various DOM levels
    // For example, APE returns  the slider position normalised in a <value> tag.
    this.interfaceObjects = [];
    this.interfaceObject = function () {};

    this.resizeWindow = function (event) {
        popup.resize(event);
        this.volume.resize();
        this.lightbox.resize();
        this.commentBoxes.boxes.forEach(function (elem) {
            elem.resize();
        });
        this.commentQuestions.forEach(function (elem) {
            elem.resize();
        });
        try {
            resizeWindow(event);
        } catch (err) {
            console.log("Warning - Interface does not have Resize option");
            console.log(err);
        }
    };

    this.returnNavigator = function () {
        var node = storage.document.createElement("navigator");
        var platform = storage.document.createElement("platform");
        platform.textContent = navigator.platform;
        var vendor = storage.document.createElement("vendor");
        vendor.textContent = navigator.vendor;
        var userAgent = storage.document.createElement("uagent");
        userAgent.textContent = navigator.userAgent;
        var screen = storage.document.createElement("window");
        screen.setAttribute('innerWidth', window.innerWidth);
        screen.setAttribute('innerHeight', window.innerHeight);
        node.appendChild(platform);
        node.appendChild(vendor);
        node.appendChild(userAgent);
        node.appendChild(screen);
        return node;
    };

    this.returnDateNode = function () {
        // Create an XML Node for the Date and Time a test was conducted
        // Structure is
        // <datetime>
        //	<date year="##" month="##" day="##">DD/MM/YY</date>
        //	<time hour="##" minute="##" sec="##">HH:MM:SS</time>
        // </datetime>
        var dateTime = new Date();
        var hold = storage.document.createElement("datetime");
        var date = storage.document.createElement("date");
        var time = storage.document.createElement("time");
        date.setAttribute('year', dateTime.getFullYear());
        date.setAttribute('month', dateTime.getMonth() + 1);
        date.setAttribute('day', dateTime.getDate());
        time.setAttribute('hour', dateTime.getHours());
        time.setAttribute('minute', dateTime.getMinutes());
        time.setAttribute('secs', dateTime.getSeconds());

        hold.appendChild(date);
        hold.appendChild(time);
        return hold;

    };

    this.lightbox = {
        parent: this,
        root: document.createElement("div"),
        content: document.createElement("div"),
        accept: document.createElement("button"),
        blanker: document.createElement("div"),
        post: function (type, message) {
            switch (type) {
                case "Error":
                    this.content.className = "lightbox-error";
                    break;
                case "Warning":
                    this.content.className = "lightbox-warning";
                    break;
                default:
                    this.content.className = "lightbox-message";
                    break;
            }
            var msg = document.createElement("p");
            msg.textContent = message;
            this.content.appendChild(msg);
            this.show();
        },
        show: function () {
            this.root.style.visibility = "visible";
            this.blanker.style.visibility = "visible";
            this.accept.focus();
        },
        clear: function () {
            this.root.style.visibility = "";
            this.blanker.style.visibility = "";
            this.content.textContent = "";
        },
        handleEvent: function (event) {
            if (event.currentTarget == this.accept) {
                this.clear();
            }
        },
        resize: function (event) {
            this.root.style.left = (window.innerWidth / 2) - 250 + 'px';
        },
        isVisible: function () {
            return this.root.style.visibility == "visible";
        }
    };

    this.lightbox.root.appendChild(this.lightbox.content);
    this.lightbox.root.appendChild(this.lightbox.accept);
    this.lightbox.root.className = "popupHolder";
    this.lightbox.root.id = "lightbox-root";
    this.lightbox.accept.className = "popupButton";
    this.lightbox.accept.style.bottom = "10px";
    this.lightbox.accept.textContent = "OK";
    this.lightbox.accept.style.left = "237.5px";
    this.lightbox.accept.addEventListener("click", this.lightbox);
    this.lightbox.blanker.className = "testHalt";
    this.lightbox.blanker.id = "lightbox-blanker";
    document.getElementsByTagName("body")[0].appendChild(this.lightbox.root);
    document.getElementsByTagName("body")[0].appendChild(this.lightbox.blanker);

    this.commentBoxes = (function () {
        var commentBoxes = {};
        commentBoxes.boxes = [];
        commentBoxes.injectPoint = null;
        commentBoxes.elementCommentBox = function (audioObject) {
            var element = audioObject.specification;
            this.audioObject = audioObject;
            this.id = audioObject.id;
            var audioHolderObject = audioObject.specification.parent;
            // Create document objects to hold the comment boxes
            this.trackComment = document.createElement('div');
            this.trackComment.className = 'comment-div';
            this.trackComment.id = 'comment-div-' + audioObject.id;
            // Create a string next to each comment asking for a comment
            this.trackString = document.createElement('span');
            this.trackString.innerHTML = audioHolderObject.commentBoxPrefix + ' ' + audioObject.interfaceDOM.getPresentedId();
            // Create the HTML5 comment box 'textarea'
            this.trackCommentBox = document.createElement('textarea');
            this.trackCommentBox.rows = '4';
            this.trackCommentBox.cols = '100';
            this.trackCommentBox.name = 'trackComment' + audioObject.id;
            this.trackCommentBox.className = 'trackComment';
            var br = document.createElement('br');
            // Add to the holder.
            this.trackComment.appendChild(this.trackString);
            this.trackComment.appendChild(br);
            this.trackComment.appendChild(this.trackCommentBox);

            this.exportXMLDOM = function () {
                var root = document.createElement('comment');
                var question = document.createElement('question');
                question.textContent = this.trackString.textContent;
                var response = document.createElement('response');
                response.textContent = this.trackCommentBox.value;
                console.log("Comment frag-" + this.id + ": " + response.textContent);
                root.appendChild(question);
                root.appendChild(response);
                return root;
            };
            this.resize = function () {
                var boxwidth = (window.innerWidth - 100) / 2;
                if (boxwidth >= 600) {
                    boxwidth = 600;
                } else if (boxwidth < 400) {
                    boxwidth = 400;
                }
                this.trackComment.style.width = boxwidth + "px";
                this.trackCommentBox.style.width = boxwidth - 6 + "px";
            };
            this.resize();
            this.highlight = function (state) {
                if (state === true) {
                    $(this.trackComment).addClass("comment-box-playing");
                } else {
                    $(this.trackComment).removeClass("comment-box-playing");
                }
            };
        };
        commentBoxes.createCommentBox = function (audioObject) {
            var node = new this.elementCommentBox(audioObject);
            this.boxes.push(node);
            audioObject.commentDOM = node;
            return node;
        };
        commentBoxes.sortCommentBoxes = function () {
            this.boxes.sort(function (a, b) {
                return a.id - b.id;
            });
        };

        commentBoxes.showCommentBoxes = function (inject, sort) {
            this.injectPoint = inject;
            if (sort) {
                this.sortCommentBoxes();
            }
            this.boxes.forEach(function (box) {
                inject.appendChild(box.trackComment);
            });
        };

        commentBoxes.deleteCommentBoxes = function () {
            if (this.injectPoint !== null) {
                this.boxes.forEach(function (box) {
                    this.injectPoint.removeChild(box.trackComment);
                }, this);
                this.injectPoint = null;
            }
            this.boxes = [];
        };
        commentBoxes.highlightById = function (id) {
            if (id === undefined || typeof id !== "number" || id >= this.boxes.length) {
                console.log("Error - Invalid id");
                id = -1;
            }
            this.boxes.forEach(function (a) {
                if (a.id === id) {
                    a.highlight(true);
                } else {
                    a.highlight(false);
                }
            });
        };
        return commentBoxes;
    })();

    this.commentQuestions = [];

    this.commentBox = function (commentQuestion) {
        this.specification = commentQuestion;
        // Create document objects to hold the comment boxes
        this.holder = document.createElement('div');
        this.holder.className = 'comment-div';
        // Create a string next to each comment asking for a comment
        this.string = document.createElement('span');
        this.string.innerHTML = commentQuestion.statement;
        // Create the HTML5 comment box 'textarea'
        this.textArea = document.createElement('textarea');
        this.textArea.rows = '4';
        this.textArea.cols = '100';
        this.textArea.className = 'trackComment';
        var br = document.createElement('br');
        // Add to the holder.
        this.holder.appendChild(this.string);
        this.holder.appendChild(br);
        this.holder.appendChild(this.textArea);

        this.exportXMLDOM = function (storePoint) {
            var root = storePoint.parent.document.createElement('comment');
            root.id = this.specification.id;
            root.setAttribute('type', this.specification.type);
            console.log("Question: " + this.string.textContent);
            console.log("Response: " + root.textContent);
            var question = storePoint.parent.document.createElement('question');
            question.textContent = this.string.textContent;
            var response = storePoint.parent.document.createElement('response');
            response.textContent = this.textArea.value;
            root.appendChild(question);
            root.appendChild(response);
            storePoint.XMLDOM.appendChild(root);
            return root;
        };
        this.resize = function () {
            var boxwidth = (window.innerWidth - 100) / 2;
            if (boxwidth >= 600) {
                boxwidth = 600;
            } else if (boxwidth < 400) {
                boxwidth = 400;
            }
            this.holder.style.width = boxwidth + "px";
            this.textArea.style.width = boxwidth - 6 + "px";
        };
        this.resize();
        this.check = function () {
            if (this.specification.mandatory && this.textArea.value.length === 0) {
                return false;
            }
            return true;
        };
    };

    this.radioBox = function (commentQuestion) {
        this.specification = commentQuestion;
        // Create document objects to hold the comment boxes
        this.holder = document.createElement('div');
        this.holder.className = 'comment-div';
        // Create a string next to each comment asking for a comment
        this.string = document.createElement('span');
        this.string.innerHTML = commentQuestion.statement;
        // Add to the holder.
        this.holder.appendChild(this.string);
        this.options = [];
        this.inputs = document.createElement('div');
        this.inputs.className = "comment-checkbox-inputs-holder";

        var optCount = commentQuestion.options.length;
        for (var i = 0; i < optCount; i++) {
            var div = document.createElement('div');
            div.className = "comment-checkbox-inputs-flex";

            var span = document.createElement('span');
            span.textContent = commentQuestion.options[i].text;
            span.className = 'comment-radio-span';
            div.appendChild(span);

            var input = document.createElement('input');
            input.type = 'radio';
            input.name = commentQuestion.id;
            input.setAttribute('setvalue', commentQuestion.options[i].name);
            input.className = 'comment-radio';
            div.appendChild(input);

            this.inputs.appendChild(div);
            this.options.push(input);
        }
        this.holder.appendChild(this.inputs);

        this.exportXMLDOM = function (storePoint) {
            var root = storePoint.parent.document.createElement('comment');
            root.id = this.specification.id;
            root.setAttribute('type', this.specification.type);
            var question = document.createElement('question');
            question.textContent = this.string.textContent;
            var response = document.createElement('response');
            var i = 0;
            while (this.options[i].checked === false) {
                i++;
                if (i >= this.options.length) {
                    break;
                }
            }
            if (i >= this.options.length) {
                response.textContent = 'null';
            } else {
                response.textContent = this.options[i].getAttribute('setvalue');
                response.setAttribute('number', i);
            }
            console.log('Comment: ' + question.textContent);
            console.log('Response: ' + response.textContent);
            root.appendChild(question);
            root.appendChild(response);
            storePoint.XMLDOM.appendChild(root);
            return root;
        };
        this.resize = function () {
            var boxwidth = (window.innerWidth - 100) / 2;
            if (boxwidth >= 600) {
                boxwidth = 600;
            } else if (boxwidth < 400) {
                boxwidth = 400;
            }
            this.holder.style.width = boxwidth + "px";
        };
        this.check = function () {
            var anyChecked = this.options.some(function (a) {
                return a.checked;
            });
            if (this.specification.mandatory && anyChecked === false) {
                return false;
            }
            return true;
        };
        this.resize();
    };

    this.checkboxBox = function (commentQuestion) {
        this.specification = commentQuestion;
        // Create document objects to hold the comment boxes
        this.holder = document.createElement('div');
        this.holder.className = 'comment-div';
        // Create a string next to each comment asking for a comment
        this.string = document.createElement('span');
        this.string.innerHTML = commentQuestion.statement;
        // Add to the holder.
        this.holder.appendChild(this.string);
        this.options = [];
        this.inputs = document.createElement('div');
        this.inputs.className = "comment-checkbox-inputs-holder";

        var optCount = commentQuestion.options.length;
        for (var i = 0; i < optCount; i++) {
            var div = document.createElement('div');
            div.className = "comment-checkbox-inputs-flex";

            var span = document.createElement('span');
            span.textContent = commentQuestion.options[i].text;
            span.className = 'comment-radio-span';
            div.appendChild(span);

            var input = document.createElement('input');
            input.type = 'checkbox';
            input.name = commentQuestion.id;
            input.setAttribute('setvalue', commentQuestion.options[i].name);
            input.className = 'comment-radio';
            div.appendChild(input);

            this.inputs.appendChild(div);
            this.options.push(input);
        }
        this.holder.appendChild(this.inputs);

        this.exportXMLDOM = function (storePoint) {
            var root = storePoint.parent.document.createElement('comment');
            root.id = this.specification.id;
            root.setAttribute('type', this.specification.type);
            var question = document.createElement('question');
            question.textContent = this.string.textContent;
            root.appendChild(question);
            console.log('Comment: ' + question.textContent);
            for (var i = 0; i < this.options.length; i++) {
                var response = document.createElement('response');
                response.textContent = this.options[i].checked;
                response.setAttribute('name', this.options[i].getAttribute('setvalue'));
                root.appendChild(response);
                console.log('Response ' + response.getAttribute('name') + ': ' + response.textContent);
            }
            storePoint.XMLDOM.appendChild(root);
            return root;
        };
        this.resize = function () {
            var boxwidth = (window.innerWidth - 100) / 2;
            if (boxwidth >= 600) {
                boxwidth = 600;
            } else if (boxwidth < 400) {
                boxwidth = 400;
            }
            this.holder.style.width = boxwidth + "px";
        };
        this.check = function () {
            var anyChecked = this.options.some(function (a) {
                return a.checked;
            });
            if (this.specification.mandatory && anyChecked === false) {
                return false;
            }
            return true;
        };
        this.resize();
    };

    this.sliderBox = function (commentQuestion) {
        this.specification = commentQuestion;
        this.holder = document.createElement("div");
        this.holder.className = 'comment-div';
        this.string = document.createElement("span");
        this.string.innerHTML = commentQuestion.statement;
        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.min = commentQuestion.min;
        this.slider.max = commentQuestion.max;
        this.slider.step = commentQuestion.step;
        this.slider.value = commentQuestion.value;
        var br = document.createElement('br');

        var textHolder = document.createElement("div");
        textHolder.className = "comment-slider-text-holder";

        this.leftText = document.createElement("span");
        this.leftText.textContent = commentQuestion.leftText;
        this.rightText = document.createElement("span");
        this.rightText.textContent = commentQuestion.rightText;
        textHolder.appendChild(this.leftText);
        textHolder.appendChild(this.rightText);

        this.holder.appendChild(this.string);
        this.holder.appendChild(br);
        this.holder.appendChild(this.slider);
        this.holder.appendChild(textHolder);

        this.exportXMLDOM = function (storePoint) {
            var root = storePoint.parent.document.createElement('comment');
            root.id = this.specification.id;
            root.setAttribute('type', this.specification.type);
            console.log("Question: " + this.string.textContent);
            console.log("Response: " + this.slider.value);
            var question = storePoint.parent.document.createElement('question');
            question.textContent = this.string.textContent;
            var response = storePoint.parent.document.createElement('response');
            response.textContent = this.slider.value;
            root.appendChild(question);
            root.appendChild(response);
            storePoint.XMLDOM.appendChild(root);
            return root;
        };
        this.resize = function () {
            var boxwidth = (window.innerWidth - 100) / 2;
            if (boxwidth >= 600) {
                boxwidth = 600;
            } else if (boxwidth < 400) {
                boxwidth = 400;
            }
            this.holder.style.width = boxwidth + "px";
            this.slider.style.width = boxwidth - 24 + "px";
        };
        this.check = function () {
            return true;
        };
        this.resize();
    };

    this.createCommentQuestion = function (element) {
        var node;
        if (element.type == 'question') {
            node = new this.commentBox(element);
        } else if (element.type == 'radio') {
            node = new this.radioBox(element);
        } else if (element.type == 'checkbox') {
            node = new this.checkboxBox(element);
        } else if (element.type == 'slider') {
            node = new this.sliderBox(element);
        }
        this.commentQuestions.push(node);
        return node;
    };

    this.deleteCommentQuestions = function () {
        this.commentQuestions = [];
    };

    this.checkCommentQuestions = function () {
        var errored = this.commentQuestions.reduce(function (a, cq) {
            if (cq.check() === false) {
                a.push(cq);
            }
            return a;
        }, []);
        if (errored.length === 0) {
            return true;
        }
        interfaceContext.lightbox.post("Message", "Not all the mandatory comment boxes below have been filled.");
    };

    this.outsideReferenceDOM = function (audioObject, index, inject) {
        this.parent = audioObject;
        this.outsideReferenceHolder = document.createElement('button');
        this.outsideReferenceHolder.className = 'outside-reference';
        this.outsideReferenceHolder.setAttribute('track-id', index);
        this.outsideReferenceHolder.textContent = this.parent.specification.label || "Reference";
        this.outsideReferenceHolder.disabled = true;
        this.handleEvent = function (event) {
            audioEngineContext.play(this.parent.id);
        };
        this.outsideReferenceHolder.addEventListener("click", this);
        inject.appendChild(this.outsideReferenceHolder);
        this.enable = function () {
            if (this.parent.state == 1) {
                this.outsideReferenceHolder.disabled = false;
            }
        };
        this.updateLoading = function (progress) {
            if (progress != 100) {
                progress = String(progress);
                progress = progress.split('.')[0];
                this.outsideReferenceHolder.textContent = progress + '%';
            } else {
                this.outsideReferenceHolder.textContent = this.parent.specification.label || "Reference";
            }
        };
        this.startPlayback = function () {
            // Called when playback has begun
            $('.track-slider').removeClass('track-slider-playing');
            $('.comment-div').removeClass('comment-box-playing');
            this.outsideReferenceHolder.style.backgroundColor = "#FDD";
        };
        this.stopPlayback = function () {
            // Called when playback has stopped. This gets called even if playback never started!
            this.outsideReferenceHolder.style.backgroundColor = "";
        };
        this.exportXMLDOM = function (audioObject) {
            return null;
        };
        this.getValue = function () {
            return 0;
        };
        this.getPresentedId = function () {
            return this.parent.specification.label || "Reference";
        };
        this.canMove = function () {
            return false;
        };
        this.error = function () {
            // audioObject has an error!!
            this.outsideReferenceHolder.textContent = "Error";
            this.outsideReferenceHolder.style.backgroundColor = "#F00";
        };
    };

    this.playhead = (function () {
        var playhead = {};
        playhead.object = document.createElement('div');
        playhead.object.className = 'playhead';
        playhead.object.align = 'left';
        var curTime = document.createElement('div');
        curTime.style.width = '50px';
        playhead.curTimeSpan = document.createElement('span');
        playhead.curTimeSpan.textContent = '00:00';
        curTime.appendChild(playhead.curTimeSpan);
        playhead.object.appendChild(curTime);
        playhead.scrubberTrack = document.createElement('div');
        playhead.scrubberTrack.className = 'playhead-scrub-track';

        playhead.scrubberHead = document.createElement('div');
        playhead.scrubberHead.id = 'playhead-scrubber';
        playhead.scrubberTrack.appendChild(playhead.scrubberHead);
        playhead.object.appendChild(playhead.scrubberTrack);

        playhead.timePerPixel = 0;
        playhead.maxTime = 0;

        playhead.playbackObject = undefined;

        playhead.setTimePerPixel = function (audioObject) {
            //maxTime must be in seconds
            this.playbackObject = audioObject;
            this.maxTime = audioObject.buffer.buffer.duration;
            var width = 490; //500 - 10, 5 each side of the tracker head
            this.timePerPixel = this.maxTime / 490;
            if (this.maxTime < 60) {
                this.curTimeSpan.textContent = '0.00';
            } else {
                this.curTimeSpan.textContent = '00:00';
            }
        };

        playhead.update = function () {
            // Update the playhead position, startPlay must be called
            if (this.timePerPixel > 0) {
                var time = this.playbackObject.getCurrentPosition();
                if (time > 0 && time < this.maxTime) {
                    var width = 490;
                    var pix = Math.floor(time / this.timePerPixel);
                    this.scrubberHead.style.left = pix + 'px';
                    if (this.maxTime > 60.0) {
                        var secs = time % 60;
                        var mins = Math.floor((time - secs) / 60);
                        secs = secs.toString();
                        secs = secs.substr(0, 2);
                        mins = mins.toString();
                        this.curTimeSpan.textContent = mins + ':' + secs;
                    } else {
                        time = time.toString();
                        this.curTimeSpan.textContent = time.substr(0, 4);
                    }
                } else {
                    this.scrubberHead.style.left = '0px';
                    if (this.maxTime < 60) {
                        this.curTimeSpan.textContent = '0.00';
                    } else {
                        this.curTimeSpan.textContent = '00:00';
                    }
                }
            }
            if (this.playbackObject !== undefined && this.interval === undefined) {
                window.requestAnimationFrame(this.update.bind(this));
            }
        };

        playhead.interval = undefined;

        playhead.start = function () {
            if (this.playbackObject !== undefined && this.interval === undefined) {
                window.requestAnimationFrame(this.update.bind(this));
            }
        };
        playhead.stop = function () {
            this.timePerPixel = 0;
        };
        return playhead;
    })();

    this.volume = (function () {
        // An in-built volume module which can be viewed on page
        // Includes trackers on page-by-page data
        // Volume does NOT reset to 0dB on each page load
        var volume = {};
        volume.valueLin = 1.0;
        volume.valueDB = 0.0;
        volume.root = document.createElement('div');
        volume.root.id = 'master-volume-root';
        volume.object = document.createElement('div');
        volume.object.className = 'master-volume-holder-float';
        volume.object.appendChild(volume.root);
        volume.slider = document.createElement('input');
        volume.slider.id = 'master-volume-control';
        volume.slider.type = 'range';
        volume.valueText = document.createElement('span');
        volume.valueText.id = 'master-volume-feedback';
        volume.valueText.textContent = '0dB';

        volume.slider.min = -60;
        volume.slider.max = 12;
        volume.slider.value = 0;
        volume.slider.step = 1;
        volume.handleEvent = function (event) {
            if (event.type == "mousemove" || event.type == "mouseup") {
                this.valueDB = Number(this.slider.value);
                this.valueLin = decibelToLinear(this.valueDB);
                this.valueText.textContent = this.valueDB + 'dB';
                audioEngineContext.outputGain.gain.value = this.valueLin;
            }
            if (event.type == "mouseup") {
                this.onmouseup();
            }
            this.slider.value = this.valueDB;

            if (event.stopPropagation) {
                event.stopPropagation();
            }
        };
        volume.onmouseup = function () {
            var storePoint = testState.currentStore.XMLDOM.getElementsByTagName('metric')[0].getAllElementsByName('volumeTracker');
            if (storePoint.length === 0) {
                storePoint = storage.document.createElement('metricresult');
                storePoint.setAttribute('name', 'volumeTracker');
                testState.currentStore.XMLDOM.getElementsByTagName('metric')[0].appendChild(storePoint);
            } else {
                storePoint = storePoint[0];
            }
            var node = storage.document.createElement('movement');
            node.setAttribute('test-time', audioEngineContext.timer.getTestTime());
            node.setAttribute('volume', this.valueDB);
            node.setAttribute('format', 'dBFS');
            storePoint.appendChild(node);
        };
        volume.slider.addEventListener("mousemove", volume);
        volume.root.addEventListener("mouseup", volume);

        var title = document.createElement('div');
        title.innerHTML = '<span>Master Volume Control</span>';
        title.style.fontSize = '0.75em';
        title.style.width = "100%";
        title.align = 'center';
        volume.root.appendChild(title);

        volume.root.appendChild(volume.slider);
        volume.root.appendChild(volume.valueText);

        volume.resize = function (event) {
            if (window.innerWidth < 1000) {
                this.object.className = "master-volume-holder-inline";
            } else {
                this.object.className = 'master-volume-holder-float';
            }
        };
        return volume;
    })();

    this.imageHolder = (function () {
        var imageController = {};
        imageController.root = document.createElement("div");
        imageController.root.id = "imageController";
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

    this.calibrationTests = (function () {
        function readonly(t) {
            throw ("Cannot set read-only variable");
        }

        function getStorageRoot() {
            var storageRoot = storage.root.querySelector("calibration");
            if (storageRoot === undefined) {
                storageRoot = storage.document.createElement("calibration");
                storage.root.appendChild(storageRoot);
            }
            return storageRoot;
        }
        var calibrationObject,
            _checkedFrequency = false,
            _checkedChannels = false;

        // Define the checkFrequencies test!
        var checkFrequencyUnit = function (htmlRoot, storageRoot) {

            function createFrequencyElement(frequency) {
                return (function (frequency) {
                    var hold = document.createElement("div");
                    hold.className = "calibration-slider";
                    var range = document.createElement("input");
                    range.type = "range";
                    range.min = "-24";
                    range.max = "24";
                    range.step = "0.5";
                    range.setAttribute("orient", "vertical");
                    range.value = (Math.random() - 0.5) * 24;
                    range.setAttribute("frequency", frequency);
                    hold.appendChild(range);
                    htmlRoot.appendChild(hold);

                    var gain = audioContext.createGain();
                    gain.connect(outputGain);
                    gain.gain.value = Math.pow(10, Number(range.value) / 20.0);
                    var osc;

                    var store = storage.document.createElement("response");
                    store.setAttribute("frequency", frequency);
                    storageHook.appendChild(store);
                    var interface = {};
                    Object.defineProperties(interface, {
                        "handleEvent": {
                            "value": function (e) {
                                if (e.type == "mouseenter") {
                                    osc = audioContext.createOscillator();
                                    osc.frequency.value = frequency;
                                    osc.connect(gain);
                                    osc.start();
                                    console.log("start " + frequency);
                                } else if (e.type == "mouseleave") {
                                    console.log("stop " + frequency);
                                    osc.stop();
                                    osc = undefined;
                                }
                                store.textContent = e.currentTarget.value;
                                gain.gain.value = Math.pow(10, Number(e.currentTarget.value) / 20.0);
                            }
                        }
                    });
                    range.addEventListener("mousemove", interface);
                    range.addEventListener("mouseenter", interface);
                    range.addEventListener("mouseleave", interface);
                    return interface;
                })(frequency);
            }
            var htmlHook = document.createElement("div");
            htmlRoot.appendChild(htmlHook);
            var storageHook = storage.document.createElement("frequency");
            storageRoot.appendChild(storageHook);
            var frequencies = [100, 200, 400, 800, 1200, 1600, 2000, 4000, 8000, 12000];
            var outputGain = audioContext.createGain();
            outputGain.gain.value = 0.25;
            outputGain.connect(audioContext.destination);
            this.sliders = frequencies.map(createFrequencyElement);
        };

        var checkChannelsUnit = function (htmlRoot, storageRoot) {

            function onclick(ev) {
                var storageHook = storage.document.querySelector("calibration").querySelector("channels");
                storageHook.setAttribute("selected", ev.currentTarget.value);
                storageHook.setAttribute("selectedText", ev.currentTarget.textContent);
                osc.stop();
                gainL = undefined;
                gainR = undefined;
                cmerge = undefined;
                popup.proceedClicked();
            }
            var osc = audioContext.createOscillator();
            var gainL = audioContext.createGain();
            var gainR = audioContext.createGain();
            gainL.channelCount = 1;
            gainR.channelCount = 1;
            var cmerge = audioContext.createChannelMerger(2);
            osc.connect(gainL, 0, 0);
            osc.connect(gainR, 0, 0);
            gainL.connect(cmerge, 0, 0);
            gainR.connect(cmerge, 0, 1);
            cmerge.connect(audioContext.destination);
            var play = document.createElement("button");
            play.textContent = "Play Audio";
            play.onclick = function () {
                osc.start();
                play.disabled = true;
            };
            play.className = "calibration-button";
            htmlRoot.appendChild(play);
            var choiceHolder = document.createElement("div");
            var leftButton = document.createElement("button");
            leftButton.textContent = "Left";
            leftButton.value = "-1";
            leftButton.className = "calibration-button";
            var centerButton = document.createElement("button");
            centerButton.textContent = "Middle";
            centerButton.value = "0";
            centerButton.className = "calibration-button";
            var rightButton = document.createElement("button");
            rightButton.textContent = "Right";
            rightButton.value = "1";
            rightButton.className = "calibration-button";
            choiceHolder.appendChild(leftButton);
            choiceHolder.appendChild(centerButton);
            choiceHolder.appendChild(rightButton);
            htmlRoot.appendChild(choiceHolder);
            leftButton.addEventListener("click", onclick);
            centerButton.addEventListener("click", onclick);
            rightButton.addEventListener("click", onclick);

            var storageHook = storage.document.createElement("channels");
            storageRoot.appendChild(storageHook);

            var pan;
            if (Math.random() > 0.5) {
                pan = 1;
                gainL.gain.value = 0.0;
                gainR.gain.value = 0.25;
                storageHook.setAttribute("presented", pan);
                storageHook.setAttribute("presentedText", "Right");
            } else {
                pan = -1;
                gainL.gain.value = 0.25;
                gainR.gain.value = 0.0;
                storageHook.setAttribute("presented", pan);
                storageHook.setAttribute("presentedText", "Left");
            }
        };

        var interface = {};
        Object.defineProperties(interface, {
            "calibrationObject": {
                "get": function () {
                    return calibrationObject;
                },
                "set": readonly
            },
            "checkFrequencies": {
                "get": function () {
                    if (specification.calibration.checkFrequencies && _checkedFrequency === false) {
                        return true;
                    }
                    return false;
                },
                "set": readonly
            },
            "checkChannels": {
                "get": function () {
                    if (specification.calibration.checkChannels && _checkedChannels === false) {
                        return true;
                    }
                    return false;
                },
                "set": readonly
            },
            "performFrequencyCheck": {
                "value": function (htmlRoot) {
                    htmlRoot.innerHTML = "";
                    calibrationObject = new checkFrequencyUnit(htmlRoot, getStorageRoot());
                    _checkedFrequency = true;
                }
            },
            "performChannelCheck": {
                "value": function (htmlRoot) {
                    htmlRoot.innerHTML = "";
                    calibrationObject = new checkChannelsUnit(htmlRoot, getStorageRoot());
                    _checkedChannels = true;
                }
            }
        });
        return interface;
    })();


    // Global Checkers
    // These functions will help enforce the checkers
    this.checkHiddenAnchor = function (message) {
        var anchors = audioEngineContext.audioObjects.filter(function (ao) {
            return ao.specification.type === "anchor";
        });
        var state = anchors.some(function (ao) {
            return (ao.interfaceDOM.getValue() > (ao.specification.marker / 100) && ao.specification.marker > 0);
        });
        if (state) {
            console.log('Anchor node not below marker value');
            if (message) {
                interfaceContext.lightbox.post("Message", message);
            } else {
                interfaceContext.lightbox.post("Message", 'Please keep listening');
            }
            this.storeErrorNode('Anchor node not below marker value');
            return false;
        }
        return true;
    };

    this.checkHiddenReference = function (message) {
        var references = audioEngineContext.audioObjects.filter(function (ao) {
            return ao.specification.type === "reference";
        });
        var state = references.some(function (ao) {
            return (ao.interfaceDOM.getValue() < (ao.specification.marker / 100) && ao.specification.marker > 0);
        });
        if (state) {
            console.log('Reference node not below marker value');
            if (message) {
                interfaceContext.lightbox.post("Message", message);
            } else {
                interfaceContext.lightbox.post("Message", 'Please keep listening');
            }
            this.storeErrorNode('Reference node not below marker value');
            return false;
        }
        return true;
    };

    this.checkFragmentsFullyPlayed = function (message) {
        // Checks the entire file has been played back
        // NOTE ! This will return true IF playback is Looped!!!
        if (audioEngineContext.loopPlayback) {
            console.log("WARNING - Looped source: Cannot check fragments are fully played");
            return true;
        }
        var check_pass = true;
        var error_obj = [],
            i;
        for (i = 0; i < audioEngineContext.audioObjects.length; i++) {
            var object = audioEngineContext.audioObjects[i];
            var time = object.buffer.buffer.duration;
            var metric = object.metric;
            var passed = false;
            for (var j = 0; j < metric.listenTracker.length; j++) {
                var bt = metric.listenTracker[j].getElementsByTagName('testtime');
                var start_time = Number(bt[0].getAttribute('start'));
                var stop_time = Number(bt[0].getAttribute('stop'));
                var delta = stop_time - start_time;
                if (delta >= time) {
                    passed = true;
                    break;
                }
            }
            if (passed === false) {
                check_pass = false;
                console.log("Continue listening to track-" + object.interfaceDOM.getPresentedId());
                error_obj.push(object.interfaceDOM.getPresentedId());
            }
        }
        if (check_pass === false) {
            var str_start = "You have not completely listened to fragments ";
            for (i = 0; i < error_obj.length; i++) {
                str_start += error_obj[i];
                if (i != error_obj.length - 1) {
                    str_start += ', ';
                }
            }
            str_start += ". Please keep listening";
            console.log(str_start);
            this.storeErrorNode(str_start);
            if (message) {
                str_start = message;
            }
            interfaceContext.lightbox.post("Error", str_start);
            return false;
        }
        return true;
    };
    this.checkAllMoved = function (message) {
        var str = "You have not moved ";
        var failed = [];
        audioEngineContext.audioObjects.forEach(function (ao) {
            if (ao.metric.wasMoved === false && ao.interfaceDOM.canMove() === true) {
                failed.push(ao.interfaceDOM.getPresentedId());
            }
        }, this);
        if (failed.length === 0) {
            return true;
        } else if (failed.length == 1) {
            str += 'track ' + failed[0];
        } else {
            str += 'tracks ';
            for (var i = 0; i < failed.length - 1; i++) {
                str += failed[i] + ', ';
            }
            str += 'and ' + failed[i];
        }
        str += '.';
        console.log(str);
        this.storeErrorNode(str);
        if (message) {
            str = message;
        }
        interfaceContext.lightbox.post("Error", str);
        return false;
    };
    this.checkAllPlayed = function (message) {
        var str = "You have not played ";
        var failed = [];
        audioEngineContext.audioObjects.forEach(function (ao) {
            if (ao.metric.wasListenedTo === false) {
                failed.push(ao.interfaceDOM.getPresentedId());
            }
        }, this);
        if (failed.length === 0) {
            return true;
        } else if (failed.length == 1) {
            str += 'track ' + failed[0];
        } else {
            str += 'tracks ';
            for (var i = 0; i < failed.length - 1; i++) {
                str += failed[i] + ', ';
            }
            str += 'and ' + failed[i];
        }
        str += '.';
        console.log(str);
        this.storeErrorNode(str);
        if (message) {
            str = message;
        }
        interfaceContext.lightbox.post("Error", str);
        return false;
    };
    this.checkAllCommented = function (message) {
        var str = "You have not commented on all the fragments.";
        var cont = true,
            boxes = this.commentBoxes.boxes,
            numBoxes = boxes.length,
            i;
        for (i = 0; i < numBoxes; i++) {
            if (boxes[i].trackCommentBox.value === "") {
                console.log(str);
                this.storeErrorNode(str);
                if (message) {
                    str = message;
                }
                interfaceContext.lightbox.post("Error", str);
                return false;
            }
        }
        return true;
    };
    this.checkScaleRange = function (message) {
        var page = testState.getCurrentTestPage();
        var interfaceObject = page.interfaces;
        var state = true;
        var str = "Please keep listening. ";
        if (interfaceObject === undefined) {
            return true;
        }
        interfaceObject = interfaceObject[0];
        var scales = (function () {
            var scaleRange = interfaceObject.options.find(function (a) {
                return a.name == "scalerange";
            });
            return {
                min: scaleRange.min,
                max: scaleRange.max
            };
        })();
        var range = audioEngineContext.audioObjects.reduce(function (a, b) {
            var v = b.interfaceDOM.getValue() * 100.0;
            return {
                min: Math.min(a.min, v),
                max: Math.max(a.max, v)
            };
        }, {
            min: 100,
            max: 0
        });
        if (range.min > scales.min) {
            str += "At least one fragment must be below the " + scales.min + " mark.";
            state = false;
        } else if (range.max < scales.max) {
            str += "At least one fragment must be above the " + scales.max + " mark.";
            state = false;
        }
        if (state === false) {
            console.log(str);
            this.storeErrorNode(str);
            if (message) {
                str = message;
            }
            interfaceContext.lightbox.post("Error", str);
        }
        return state;
    };
    this.checkFragmentMinPlays = function () {
        var failedObjects = audioEngineContext.audioObjects.filter(function (a) {
            var minPlays = a.specification.minNumberPlays || a.specification.parent.minNumberPlays || specification.minNumberPlays;
            if (minPlays === undefined || a.numberOfPlays >= minPlays) {
                return false;
            }
            return true;
        });
        if (failedObjects.length === 0) {
            return true;
        }
        var failedString = [];
        failedObjects.forEach(function (a) {
            failedString.push(a.interfaceDOM.getPresentedId());
        });
        var str = "You have not played fragments " + failedString.join(", ") + " enough. Please keep listening";
        interfaceContext.lightbox.post("Message", str);
        this.storeErrorNode(str);
        return false;
    };


    this.sortFragmentsByScore = function () {
        var elements = audioEngineContext.audioObjects.filter(function (elem) {
            return elem.specification.type !== "outside-reference";
        });
        var indexes = [];
        var i = 0;
        while (indexes.push(i++) < elements.length);
        return indexes.sort(function (x, y) {
            var a = elements[x].interfaceDOM.getValue();
            var b = elements[y].interfaceDOM.getValue();
            if (a > b) {
                return 1;
            } else if (a < b) {
                return -1;
            }
            return 0;
        }, elements[0].interfaceDOM.getValue());
    };

    this.storeErrorNode = function (errorMessage) {
        var time = audioEngineContext.timer.getTestTime();
        var node = storage.document.createElement('error');
        node.setAttribute('time', time);
        node.textContent = errorMessage;
        testState.currentStore.XMLDOM.appendChild(node);
    };

    this.getLabel = function (labelType, index, labelStart) {
        /*
            Get the correct label based on type, index and offset
        */

        function calculateLabel(labelType, index, offset) {
            if (labelType == "none") {
                return "";
            }
            switch (labelType) {
                case "letter":
                    return String.fromCharCode((index + offset) % 26 + 97);
                case "capital":
                    return String.fromCharCode((index + offset) % 26 + 65);
                case "samediff":
                    if (index === 0) {
                        return "Same";
                    } else if (index == 1) {
                        return "Difference";
                    }
                    return "";
                case "number":
                    return String(index + offset);
                default:
                    return "";
            }
        }

        if (typeof labelStart !== "string" || labelStart.length === 0) {
            labelStart = String.fromCharCode(0);
        }

        switch (labelType) {
            case "letter":
                labelStart = labelStart.charCodeAt(0);
                if (labelStart < 97 || labelStart > 122) {
                    labelStart = 97;
                }
                labelStart -= 97;
                break;
            case "capital":
                labelStart = labelStart.charCodeAt(0);
                if (labelStart < 65 || labelStart > 90) {
                    labelStart = 65;
                }
                labelStart -= 65;
                break;
            case "number":
                labelStart = Number(labelStart);
                if (!isFinite(labelStart)) {
                    labelStart = 1;
                }
                break;
            default:
                labelStart = 0;
        }
        if (typeof index == "number") {
            return calculateLabel(labelType, index, labelStart);
        } else if (index.length && index.length > 0) {
            var a = [],
                l = index.length,
                i;
            for (i = 0; i < l; i++) {
                a[i] = calculateLabel(labelType, index[i], labelStart);
            }
            return a;
        } else {
            throw ("Invalid arguments");
        }
    };

    this.getCombinedInterfaces = function (page) {
        // Combine the interfaces with the global interface nodes
        var global = specification.interfaces,
            local = page.interfaces;
        local.forEach(function (locInt) {
            // Iterate through the options nodes
            var addList = [];
            global.options.forEach(function (gopt) {
                var lopt = locInt.options.find(function (lopt) {
                    return (lopt.name == gopt.name) && (lopt.type == gopt.type);
                });
                if (!lopt) {
                    // Global option doesn't exist locally
                    addList.push(gopt);
                }
            });
            locInt.options = locInt.options.concat(addList);
            if (!locInt.scales && global.scales) {
                // Use the global default scales
                locInt.scales = global.scales;
            }
        });
        return local;
    };
}

function Storage() {
    // Holds results in XML format until ready for collection
    this.globalPreTest = null;
    this.globalPostTest = null;
    this.testPages = [];
    this.document = null;
    this.root = null;
    this.state = 0;
    var linkedID = undefined;
    var pFilenamePrefix = "save";

    this.initialise = function (existingStore) {
        if (existingStore === undefined) {
            // We need to get the sessionKey
            this.SessionKey.requestKey();
            this.document = document.implementation.createDocument(null, "waetresult", null);
            this.root = this.document.childNodes[0];
            var projectDocument = specification.projectXML;
            projectDocument.setAttribute('file-name', specification.url);
            projectDocument.setAttribute('url', qualifyURL(specification.url));
            this.root.appendChild(projectDocument);
            this.root.appendChild(interfaceContext.returnDateNode());
            this.root.appendChild(interfaceContext.returnNavigator());
        } else {
            this.document = existingStore;
            this.root = existingStore.firstChild;
            this.SessionKey.key = this.root.getAttribute("key");
        }
        if (specification.preTest !== undefined) {
            this.globalPreTest = new this.surveyNode(this, this.root, specification.preTest);
        }
        if (specification.postTest !== undefined) {
            this.globalPostTest = new this.surveyNode(this, this.root, specification.postTest);
        }
        if (linkedID) {
            this.root.setAttribute("linked", linkedID);
        }
    };

    this.SessionKey = (function (parent) {
        var returnURL = "";
        if (window.returnURL !== undefined) {
            returnURL = String(window.returnURL);
        }

        var chainCount = 0;
        var chainPosition = chainCount;

        function postUpdate() {
            return new Promise(function (resolve, reject) {
                // Return a new promise.
                chainPosition+=1;
                var hold = document.createElement("div");
                var clone = parent.root.cloneNode(true);
                hold.appendChild(clone);
                // Do the usual XHR stuff
                console.log("Requested save...");
                var req = new XMLHttpRequest();
                req.open("POST", returnURL + "php/save.php?key=" + sessionKey + "&saveFilenamePrefix=" + parent.filenamePrefix);
                req.setRequestHeader('Content-Type', 'text/xml');

                req.onload = function () {
                    // This is called even on 404 etc
                    // so check the status
                    if (this.status >= 300) {
                        console.log("WARNING - Could not update at this time");
                    } else {
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(req.responseText, "application/xml");
                        var response = xmlDoc.getElementsByTagName('response')[0];
                        if (response.getAttribute("state") == "OK") {
                            var file = response.getElementsByTagName("file")[0];
                            console.log("Intermediate save: OK, written " + file.getAttribute("bytes") + "B");
                            resolve(true);
                        } else {
                            var message = response.getElementsByTagName("message");
                            console.log("Intermediate save: Error! " + message.textContent);
                            reject("Intermediate save: Error! " + message.textContent);
                        }
                    }
                };

                // Handle network errors
                req.onerror = function () {
                    reject(Error("Network Error"));
                };

                // Make the request
                if (chainCount > chainPosition) {
                    // We have items downstream that will upload for us
                    resolve(true);
                } else {
                    req.send([hold.innerHTML]);
                }
            });
        }

        function keyPromise() {
            return new Promise(function (resolve, reject) {
                var req = new XMLHttpRequest();
                req.open("GET", returnURL + "php/requestKey.php?saveFilenamePrefix=" + parent.filenamePrefix, true);
                req.onload = function () {
                    // This is called even on 404 etc
                    // so check the status
                    if (req.status == 200) {
                        // Resolve the promise with the response text
                        resolve(req.response);
                    } else {
                        // Otherwise reject with the status text
                        // which will hopefully be a meaningful error
                        reject(Error(req.statusText));
                    }
                };

                // Handle network errors
                req.onerror = function () {
                    reject(Error("Network Error"));
                };

                req.send();
            });
        }

        var requestChains = null;
        var sessionKey = null;
        var object = {};

        Object.defineProperties(object, {
            "key": {
                "get": function () {
                    return sessionKey;
                },
                "set": function (a) {
                    throw ("Cannot set read-only property");
                }
            },
            "request": {
                "value": new XMLHttpRequest()
            },
            "parent": {
                "value": parent
            },
            "requestKey": {
                "value": function () {
                    requestChains = keyPromise().then(function (response) {
                        function throwerror() {
                            sessionKey = null;
                            throw ("An unspecified error occured, no server key could be generated");
                        }
                        var parse = new DOMParser();
                        var xml = parse.parseFromString(response, "text/xml");
                        if (response.length === 0) {
                            throwerror();
                        }
                        if (xml.getElementsByTagName("state").length > 0) {
                            if (xml.getElementsByTagName("state")[0].textContent == "OK") {
                                sessionKey = xml.getAllElementsByTagName("key")[0].textContent;
                                parent.root.setAttribute("key", sessionKey);
                                parent.root.setAttribute("state", "empty");
                                return (true);
                            } else if (xml.getElementsByTagName("state")[0].textContent == "ERROR") {
                                sessionKey = null;
                                console.error("Could not generate server key. Server responded with error message: \"" + xml.getElementsByTagName("message")[0].textContent + "\"");
                                return (false);
                            }
                        } else {
                            throwerror();
                        }
                        return (true);
                    });
                }
            },
            "update": {
                "value": function () {
                    if (requestChains === undefined) {
                        throw ("Initiate key exchange first");
                    }
                    chainCount += 1;
                    this.parent.root.setAttribute("state", "update");
                    requestChains = requestChains.then(postUpdate);
                }
            },
            "finish": {
                "value": function () {
                    if (this.key === null || requestChains === undefined) {
                        throw ("Cannot save as key == null");
                    }
                    this.parent.finish();
                    return requestChains.then(postUpdate()).then(function () {
                        console.log("OK");
                        return true;
                    }, function () {
                        createProjectSave("local");
                    });
                }
            }
        });
        return object;
    })(this);
    /*
    this.SessionKey = {
        key: null,
        request: new XMLHttpRequest(),
        parent: this,
        handleEvent: function () {

        },
        requestKey: function () {

        },
        update: function () {
            if (this.key === null) {
                console.log("Cannot save as key == null");
                return;
            }
            this.parent.root.setAttribute("state", "update");
            var xmlhttp = new XMLHttpRequest();
            var returnURL = "";
            if (typeof specification.projectReturn == "string") {
                if (specification.projectReturn.substr(0, 4) == "http") {
                    returnURL = specification.projectReturn;
                }
            }
            xmlhttp.open("POST", returnURL + "php/save.php?key=" + this.key + "&saveFilenamePrefix=" + this.parent.filenamePrefix);
            xmlhttp.setRequestHeader('Content-Type', 'text/xml');
            xmlhttp.onerror = function () {
                console.log('Error updating file to server!');
            };
            var hold = document.createElement("div");
            var clone = this.parent.root.cloneNode(true);
            hold.appendChild(clone);
            xmlhttp.onload = function () {
                if (this.status >= 300) {
                    console.log("WARNING - Could not update at this time");
                } else {
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(xmlhttp.responseText, "application/xml");
                    var response = xmlDoc.getElementsByTagName('response')[0];
                    if (response.getAttribute("state") == "OK") {
                        var file = response.getElementsByTagName("file")[0];
                        console.log("Intermediate save: OK, written " + file.getAttribute("bytes") + "B");
                    } else {
                        var message = response.getElementsByTagName("message");
                        console.log("Intermediate save: Error! " + message.textContent);
                    }
                }
            };
            xmlhttp.send([hold.innerHTML]);
        },
        finish: function () {
            // Final upload to complete the test
            this.parent.finish();
            var hold = document.createElement("div");
            var clone = this.parent.root.cloneNode(true);
            hold.appendChild(clone);
            var saveURL = specification.returnURL + "php/save.php?key=" + this.key + "&saveFilenamePrefix=";
            if (this.parent.filenamePrefix.length === 0) {
                saveURL += "save";
            } else {
                saveURL += this.parent.filenamePrefix;
            }
            return new Promise(function (resolve, reject) {
                var xmlhttp = new XMLHttpRequest();
                xmlhttp.open("POST", saveURL);
                xmlhttp.setRequestHeader('Content-Type', 'text/xml');
                xmlhttp.onerror = function () {
                    console.log('Error updating file to server!');
                    createProjectSave("local");
                };
                xmlhttp.onload = function () {
                    if (this.status >= 300) {
                        console.log("WARNING - Could not update at this time");
                        createProjectSave("local");
                    } else {
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(xmlhttp.responseText, "application/xml");
                        var response = xmlDoc.getElementsByTagName('response')[0];
                        if (response.getAttribute("state") == "OK") {
                            var file = response.getElementsByTagName("file")[0];
                            console.log("Intermediate save: OK, written " + file.getAttribute("bytes") + "B");
                            resolve(response);
                        } else {
                            var message = response.getElementsByTagName("message");
                            reject(message);
                        }
                    }
                };
                xmlhttp.send([hold.innerHTML]);
            });
        }
    };
    */
    this.createTestPageStore = function (specification) {
        var store = new this.pageNode(this, specification);
        this.testPages.push(store);
        return this.testPages[this.testPages.length - 1];
    };

    this.surveyNode = function (parent, root, specification) {
        this.specification = specification;
        this.parent = parent;
        this.state = "empty";
        this.XMLDOM = this.parent.document.createElement('survey');
        this.XMLDOM.setAttribute('location', this.specification.location);
        this.XMLDOM.setAttribute("state", this.state);
        this.specification.options.forEach(function (optNode) {
            if (optNode.type != 'statement') {
                var node = this.parent.document.createElement('surveyresult');
                node.setAttribute("ref", optNode.id);
                node.setAttribute('type', optNode.type);
                this.XMLDOM.appendChild(node);
            }
        }, this);
        root.appendChild(this.XMLDOM);

        this.postResult = function (node) {
            function postNumber(doc, value) {
                var child = doc.createElement("response");
                child.textContent = value;
                return child;
            }

            function postRadio(doc, node) {
                var child = doc.createElement('response');
                if (node.response !== null) {
                    child.setAttribute('name', node.response.name);
                    child.textContent = node.response.text;
                }
                return child;
            }

            function postCheckbox(doc, node) {
                var checkNode = doc.createElement('response');
                checkNode.setAttribute('name', node.name);
                checkNode.setAttribute('checked', node.checked);
                return checkNode;
            }
            // From popup: node is the popupOption node containing both spec. and results
            // ID is the position
            if (node.specification.type == 'statement') {
                return;
            }
            var surveyresult = this.XMLDOM.firstChild;
            while (surveyresult !== null) {
                if (surveyresult.getAttribute("ref") == node.specification.id) {
                    break;
                }
                surveyresult = surveyresult.nextElementSibling;
            }
            surveyresult.setAttribute("duration", node.elapsedTime);
            switch (node.specification.type) {
                case "number":
                case "question":
                case "slider":
                    surveyresult.appendChild(postNumber(this.parent.document, node.response));
                    break;
                case "radio":
                    surveyresult.appendChild(postRadio(this.parent.document, node));
                    break;
                case "checkbox":
                    if (node.response === undefined) {
                        surveyresult.appendChild(this.parent.document.createElement('response'));
                        break;
                    }
                    for (var i = 0; i < node.response.length; i++) {
                        surveyresult.appendChild(postCheckbox(this.parent.document, node.response[i]));
                    }
                    break;
            }
        };
        this.complete = function () {
            this.state = "complete";
            this.XMLDOM.setAttribute("state", this.state);
        };
    };

    this.pageNode = function (parent, specification) {
        // Create one store per test page
        this.specification = specification;
        this.parent = parent;
        this.state = "empty";
        this.XMLDOM = this.parent.document.createElement('page');
        this.XMLDOM.setAttribute('ref', specification.id);
        this.XMLDOM.setAttribute('presentedId', specification.presentedId);
        this.XMLDOM.setAttribute("state", this.state);
        if (specification.preTest !== undefined) {
            this.preTest = new this.parent.surveyNode(this.parent, this.XMLDOM, this.specification.preTest);
        }
        if (specification.postTest !== undefined) {
            this.postTest = new this.parent.surveyNode(this.parent, this.XMLDOM, this.specification.postTest);
        }

        // Add any page metrics
        var page_metric = this.parent.document.createElement('metric');
        this.XMLDOM.appendChild(page_metric);

        // Add the audioelement
        this.specification.audioElements.forEach(function (element) {
            var aeNode = this.parent.document.createElement('audioelement');
            aeNode.setAttribute('ref', element.id);
            if (element.name !== undefined) {
                aeNode.setAttribute('name', element.name);
            }
            aeNode.setAttribute('type', element.type);
            aeNode.setAttribute('url', element.url);
            aeNode.setAttribute('fqurl', qualifyURL(element.url));
            aeNode.setAttribute('gain', element.gain);
            if (element.type == 'anchor' || element.type == 'reference') {
                if (element.marker > 0) {
                    aeNode.setAttribute('marker', element.marker);
                }
            }
            var ae_metric = this.parent.document.createElement('metric');
            aeNode.appendChild(ae_metric);
            this.XMLDOM.appendChild(aeNode);
        }, this);

        this.parent.root.appendChild(this.XMLDOM);

        this.complete = function () {
            this.state = "complete";
            this.XMLDOM.setAttribute("state", "complete");
        };
    };
    this.update = function () {
        this.SessionKey.update();
    };
    this.finish = function () {
        this.state = 1;
        this.root.setAttribute("state", "complete");
        return this.root;
    };

    Object.defineProperties(this, {
        'filenamePrefix': {
            'get': function () {
                return pFilenamePrefix;
            },
            'set': function (value) {
                if (typeof value !== "string") {
                    value = String(value);
                }
                pFilenamePrefix = value;
                return value;
            }
        },
        "sessionLinked": {
            'get': function () {
                return linkedID;
            },
            'set': function(s) {
                if (typeof s == "string") {
                    linkedID = s;
                    if (this.root) {
                        this.root.setAttribute("linked", s);
                    }
                }
                return linkedID;
            }
        }
    });
}

var window_depedancy_callback;
window_depedancy_callback = window.setInterval(function () {
    if (check_dependancies()) {
        window.clearInterval(window_depedancy_callback);
        onload();
    } else {
        document.getElementById("topLevelBody").innerHTML = "<h1>Loading Resources</h1>";
    }
}, 100);

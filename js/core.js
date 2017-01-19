/**
 * core.js
 * 
 * Main script to run, calls all other core functions and manages loading/store to backend.
 * Also contains all global variables.
 */

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

// Firefox does not have an XMLDocument.prototype.getElementsByName
// and there is no searchAll style command, this custom function will
// search all children recusrively for the name. Used for XSD where all
// element nodes must have a name and therefore can pull the schema node
XMLDocument.prototype.getAllElementsByName = function (name) {
    name = String(name);
    var selected = this.documentElement.getAllElementsByName(name);
    return selected;
}

Element.prototype.getAllElementsByName = function (name) {
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while (node != null) {
        if (node.getAttribute('name') == name) {
            selected.push(node);
        }
        if (node.childElementCount > 0) {
            selected = selected.concat(node.getAllElementsByName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
}

XMLDocument.prototype.getAllElementsByTagName = function (name) {
    name = String(name);
    var selected = this.documentElement.getAllElementsByTagName(name);
    return selected;
}

Element.prototype.getAllElementsByTagName = function (name) {
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while (node != null) {
        if (node.nodeName == name) {
            selected.push(node);
        }
        if (node.childElementCount > 0) {
            selected = selected.concat(node.getAllElementsByTagName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
}

// Firefox does not have an XMLDocument.prototype.getElementsByName
if (typeof XMLDocument.prototype.getElementsByName != "function") {
    XMLDocument.prototype.getElementsByName = function (name) {
        name = String(name);
        var node = this.documentElement.firstElementChild;
        var selected = [];
        while (node != null) {
            if (node.getAttribute('name') == name) {
                selected.push(node);
            }
            node = node.nextElementSibling;
        }
        return selected;
    }
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
}

var onload = function () {
    // Function called once the browser has loaded all files.
    // This should perform any initial commands such as structure / loading documents

    // Create a web audio API context
    // Fixed for cross-browser support
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext;

    // Create test state
    testState = new stateMachine();

    // Create the popup interface object
    popup = new interfacePopup();

    // Create the specification object
    specification = new Specification();

    // Create the interface object
    interfaceContext = new Interface(specification);

    // Create the storage object
    storage = new Storage();
    // Define window callbacks for interface
    window.onresize = function (event) {
        interfaceContext.resizeWindow(event);
    };

    if (window.location.search.length != 0) {
        var search = window.location.search.split('?')[1];
        // Now split the requests into pairs
        var searchQueries = search.split('&');

        for (var i in searchQueries) {
            // Split each key-value pair
            searchQueries[i] = searchQueries[i].split('=');
            var key = searchQueries[i][0];
            var value = decodeURIComponent(searchQueries[i][1]);
            switch (key) {
                case "url":
                    url = value;
                    break;
                case "returnURL":
                    gReturnURL = value;
                    break;
                case "saveFilenamePrefix":
                    gSaveFilenamePrefix = value;
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
        schemaXSD = xmlhttp.response;
        var parse = new DOMParser();
        specification.schema = parse.parseFromString(xmlhttp.response, 'text/xml');
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
        }
        r.send();
    };
    xmlhttp.send();
};

function loadProjectSpecCallback(response) {
    // Function called after asynchronous download of XML project specification
    //var decode = $.parseXML(response);
    //projectXML = $(decode);

    // Check if XML is new or a resumption
    var parse = new DOMParser();
    var responseDocument = parse.parseFromString(response, 'text/xml');
    var errorNode = responseDocument.getElementsByTagName('parsererror');
    if (errorNode.length >= 1) {
        var msg = document.createElement("h3");
        msg.textContent = "FATAL ERROR";
        var span = document.createElement("span");
        span.textContent = "The XML parser returned the following errors when decoding your XML file";
        document.getElementsByTagName('body')[0].innerHTML = null;
        document.getElementsByTagName('body')[0].appendChild(msg);
        document.getElementsByTagName('body')[0].appendChild(span);
        document.getElementsByTagName('body')[0].appendChild(errorNode[0]);
        return;
    }
    if (responseDocument == undefined || responseDocument.firstChild == undefined) {
        var msg = document.createElement("h3");
        msg.textContent = "FATAL ERROR";
        var span = document.createElement("span");
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
            schema: schemaXSD,
            arguments: ["--noout", "--schema", 'test-schema.xsd', 'document.xml']
        };
        projectXML = responseDocument;
        var xmllint = validateXML(Module);
        console.log(xmllint);
        if (xmllint != 'document.xml validates\n') {
            document.getElementsByTagName('body')[0].innerHTML = null;
            var msg = document.createElement("h3");
            msg.textContent = "FATAL ERROR";
            var span = document.createElement("h4");
            span.textContent = "The XML validator returned the following errors when decoding your XML file";
            document.getElementsByTagName('body')[0].appendChild(msg);
            document.getElementsByTagName('body')[0].appendChild(span);
            xmllint = xmllint.split('\n');
            for (var i in xmllint) {
                document.getElementsByTagName('body')[0].appendChild(document.createElement('br'));
                var span = document.createElement("span");
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
        var child = responseDocument.firstChild.firstChild;
        while (child != null) {
            if (child.nodeName == "survey") {
                // One of the global survey elements
                if (child.getAttribute("state") == "complete") {
                    // We need to remove this survey from <setup>
                    var location = child.getAttribute("location");
                    var globalSurveys = projectXML.getElementsByTagName("setup")[0].getElementsByTagName("survey")[0];
                    while (globalSurveys != null) {
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
                    var copy = child;
                    child = child.previousElementSibling;
                    responseDocument.firstChild.removeChild(copy);
                }
            } else if (child.nodeName == "page") {
                if (child.getAttribute("state") == "empty") {
                    // We need to complete this page
                    projectXML.firstChild.appendChild(responseDocument.getElementById(child.getAttribute("ref")).cloneNode(true));
                    var copy = child;
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
    if (specification.sampleRate != undefined) {
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
    }
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
    }
    getInterfaces.send();

    if (gReturnURL != undefined) {
        console.log("returnURL Overide from " + specification.returnURL + " to " + gReturnURL);
        specification.returnURL = gReturnURL;
    }
    if (gSaveFilenamePrefix != undefined) {
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
    var xmlDoc = interfaceXMLSave();
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
        var saveUrlSuffix = "";
        var saveFilenamePrefix = specification.saveFilenamePrefix;
        if (typeof (saveFilenamePrefix) === "string" && saveFilenamePrefix.length > 0) {
            saveUrlSuffix = "&saveFilenamePrefix=" + saveFilenamePrefix;
        }
        var projectReturn = "";
        if (typeof specification.projectReturn == "string") {
            if (specification.projectReturn.substr(0, 4) == "http") {
                projectReturn = specification.projectReturn;
            }
        }
        var saveURL = projectReturn + "php/save.php?key=" + storage.SessionKey.key + saveUrlSuffix;
        var xmlhttp = new XMLHttpRequest;
        xmlhttp.open("POST", saveURL, true);
        xmlhttp.setRequestHeader('Content-Type', 'text/xml');
        xmlhttp.onerror = function () {
            console.log('Error saving file to server! Presenting download locally');
            createProjectSave("local");
        };
        xmlhttp.onload = function () {
            console.log(xmlhttp);
            if (this.status >= 300) {
                console.log("WARNING - Could not update at this time");
                createProjectSave("local");
            } else {
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xmlhttp.responseText, "application/xml");
                var response = xmlDoc.firstElementChild;
                if (response.nodeName == "response" && response.getAttribute("state") == "OK") {
                    window.onbeforeunload = undefined;
                    var file = response.getElementsByTagName("file")[0];
                    console.log("Save: OK, written " + file.getAttribute("bytes") + "B");
                    if (typeof specification.returnURL == "string" && specification.returnURL.length > 0) {
                        window.location = specification.returnURL;
                    } else {
                        popup.popupContent.textContent = specification.exitText;
                    }
                } else {
                    var message = response.getElementsByTagName("message");
                    console.log("Save: Error! " + message.textContent);
                    createProjectSave("local");
                }
            }
        };
        xmlhttp.send(file);
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
    var str = ""
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
        inputSequence.push(counter) // Fill array
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
    $(window).keypress(function (e) {
        if (e.keyCode == 13 && popup.popup.style.visibility == 'visible') {
            console.log(e);
            popup.buttonProceed.onclick();
            e.preventDefault();
        }
    });

    this.createPopup = function () {
        // Create popup window interface
        var insertPoint = document.getElementById("topLevelBody");

        this.popup = document.getElementById('popupHolder');
        this.popup.style.left = (window.innerWidth / 2) - 250 + 'px';
        this.popup.style.top = (window.innerHeight / 2) - 125 + 'px';

        this.popupContent = document.getElementById('popupContent');

        this.popupTitle = document.getElementById('popupTitle');

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
        if (this.popup == null) {
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
        var node = this.popupOptions[this.currentIndex];
        this.popupResponse.innerHTML = "";
        this.popupTitle.textContent = node.specification.statement;
        if (node.specification.type == 'question') {
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
            if (node.response == undefined) {
                node.response = "";
            } else {
                textArea.value = node.response;
            }
            this.popupResponse.appendChild(textArea);
            textArea.focus();
            this.popupResponse.style.textAlign = "center";
            this.popupResponse.style.left = "0%";
        } else if (node.specification.type == 'checkbox') {
            if (node.response == undefined) {
                node.response = Array(node.specification.options.length);
            }
            var index = 0;
            var table = document.createElement("table");
            table.className = "popup-option-list";
            table.border = "0";
            for (var option of node.specification.options) {
                var tr = document.createElement("tr");
                table.appendChild(tr);
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
                var tr = document.createElement('div');
                tr.setAttribute('name', 'option');
                tr.className = "popup-option-checbox";
                if (node.response[index] != undefined) {
                    if (node.response[index].checked == true) {
                        input.checked = "true";
                    }
                }
                index++;
            }
            this.popupResponse.appendChild(table);
        } else if (node.specification.type == 'radio') {
            if (node.response == undefined) {
                node.response = {
                    name: "",
                    text: ""
                };
            }
            var index = 0;
            var table = document.createElement("table");
            table.className = "popup-option-list";
            table.border = "0";
            for (var option of node.specification.options) {
                var tr = document.createElement("tr");
                table.appendChild(tr);
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
                var tr = document.createElement('div');
                tr.setAttribute('name', 'option');
                tr.className = "popup-option-checbox";
                if (node.response[index] != undefined) {
                    if (node.response[index].checked == true) {
                        input.checked = "true";
                    }
                }
                index++;
            }
            this.popupResponse.appendChild(table);
        } else if (node.specification.type == 'number') {
            var input = document.createElement('input');
            input.type = 'textarea';
            if (node.specification.min != null) {
                input.min = node.specification.min;
            }
            if (node.specification.max != null) {
                input.max = node.specification.max;
            }
            if (node.specification.step != null) {
                input.step = node.specification.step;
            }
            if (node.response != undefined) {
                input.value = node.response;
            }
            this.popupResponse.appendChild(input);
            this.popupResponse.style.textAlign = "center";
            this.popupResponse.style.left = "0%";
        } else if (node.specification.type == "video") {
            var video = document.createElement("video");
            video.src = node.specification.url;
            this.popupResponse.appendChild(video);
        } else if (node.specification.type == "youtube") {
            var iframe = document.createElement("iframe");
            iframe.className = "youtube";
            iframe.src = node.specification.url;
            this.popupResponse.appendChild(iframe);
        } else if (node.specification.type == "slider") {
            var hold = document.createElement('div');
            var input = document.createElement('input');
            input.type = 'range';
            input.style.width = "90%";
            if (node.specification.min != null) {
                input.min = node.specification.min;
            }
            if (node.specification.max != null) {
                input.max = node.specification.max;
            }
            if (node.response != undefined) {
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
            for (var opt of node.options) {
                this.popupOptions.push({
                    specification: opt,
                    response: null
                });
            }
            this.currentIndex = 0;
            this.showPopup();
            this.postNode();
        } else {
            advanceState();
        }
    };

    this.proceedClicked = function () {
        // Each time the popup button is clicked!
        if (testState.stateIndex == 0 && specification.calibration) {
            interfaceContext.calibrationModuleObject.collect();
            advanceState();
            return;
        }
        var node = this.popupOptions[this.currentIndex];
        if (node.specification.type == 'question') {
            // Must extract the question data
            var textArea = $(popup.popupContent).find('textarea')[0];
            if (node.specification.mandatory == true && textArea.value.length == 0) {
                interfaceContext.lightbox.post("Error", "This question is mandatory");
                return;
            } else {
                // Save the text content
                console.log("Question: " + node.specification.statement);
                console.log("Question Response: " + textArea.value);
                node.response = textArea.value;
            }
            // Perform the conditional
            for (var condition of node.specification.conditions) {
                var pass = false;
                switch (condition.check) {
                    case "equals":
                        if (textArea.value == condition.value) {
                            pass = true;
                        }
                        break;
                    case "greaterThan":
                    case "lessThan":
                        console.log("Survey Element of type 'question' cannot interpret greaterThan/lessThan conditions. IGNORING");
                        break;
                    case "contains":
                        if (textArea.value.includes(condition.value)) {
                            pass = true;
                        }
                        break;
                }
                var jumpID;
                if (pass) {
                    jumpID = condition.jumpToOnPass;
                } else {
                    jumpID = condition.jumpToOnFail;
                }
                if (jumpID != undefined) {
                    var index = this.popupOptions.findIndex(function (item, index, element) {
                        if (item.specification.id == jumpID) {
                            return true;
                        } else {
                            return false;
                        }
                    }, this);
                    this.currentIndex = index - 1;
                    break;
                }
            }
        } else if (node.specification.type == 'checkbox') {
            // Must extract checkbox data
            console.log("Checkbox: " + node.specification.statement);
            var inputs = this.popupResponse.getElementsByTagName('input');
            node.response = [];
            var numChecked = 0;
            for (var i = 0; i < node.specification.options.length; i++) {
                if (inputs[i].checked) {
                    numChecked++;
                }
            }
            if (node.specification.min != undefined) {
                if (node.specification.max == undefined) {
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
                        return;
                    }
                }
            }
            for (var i = 0; i < node.specification.options.length; i++) {
                node.response.push({
                    name: node.specification.options[i].name,
                    text: node.specification.options[i].text,
                    checked: inputs[i].checked
                });
                console.log(node.specification.options[i].name + ": " + inputs[i].checked);
            }
            // Perform the conditional
            for (var condition of node.specification.conditions) {
                var pass = false;
                switch (condition.check) {
                    case "equals":
                    case "greaterThan":
                    case "lessThan":
                        console.log("Survey Element of type 'checkbox' cannot interpret equals/greaterThan/lessThan conditions. IGNORING");
                        break;
                    case "contains":
                        for (var response of node.response) {
                            if (response.name == condition.value && response.checked) {
                                pass = true;
                                break;
                            }
                        }
                        break;
                }
                var jumpID;
                if (pass) {
                    jumpID = condition.jumpToOnPass;
                } else {
                    jumpID = condition.jumpToOnFail;
                }
                if (jumpID != undefined) {
                    var index = this.popupOptions.findIndex(function (item, index, element) {
                        if (item.specification.id == jumpID) {
                            return true;
                        } else {
                            return false;
                        }
                    }, this);
                    this.currentIndex = index - 1;
                    break;
                }
            }
        } else if (node.specification.type == "radio") {
            var optHold = this.popupResponse;
            console.log("Radio: " + node.specification.statement);
            node.response = null;
            var i = 0;
            var inputs = optHold.getElementsByTagName('input');
            while (node.response == null) {
                if (i == inputs.length) {
                    if (node.specification.mandatory == true) {
                        interfaceContext.lightbox.post("Error", "Please select one option");
                        return;
                    }
                    break;
                }
                if (inputs[i].checked == true) {
                    node.response = node.specification.options[i];
                    console.log("Selected: " + node.specification.options[i].name);
                }
                i++;
            }
            // Perform the conditional
            for (var condition of node.specification.conditions) {
                var pass = false;
                switch (condition.check) {
                    case "contains":
                    case "greaterThan":
                    case "lessThan":
                        console.log("Survey Element of type 'radio' cannot interpret contains/greaterThan/lessThan conditions. IGNORING");
                        break;
                    case "equals":
                        if (node.response == condition.value) {
                            pass = true;
                        }
                        break;
                }
                var jumpID;
                if (pass) {
                    jumpID = condition.jumpToOnPass;
                } else {
                    jumpID = condition.jumpToOnFail;
                }
                if (jumpID != undefined) {
                    var index = this.popupOptions.findIndex(function (item, index, element) {
                        if (item.specification.id == jumpID) {
                            return true;
                        } else {
                            return false;
                        }
                    }, this);
                    this.currentIndex = index - 1;
                    break;
                }
            }
        } else if (node.specification.type == "number") {
            var input = this.popupContent.getElementsByTagName('input')[0];
            if (node.mandatory == true && input.value.length == 0) {
                interfaceContext.lightbox.post("Error", 'This question is mandatory. Please enter a number');
                return;
            }
            var enteredNumber = Number(input.value);
            if (isNaN(enteredNumber)) {
                interfaceContext.lightbox.post("Error", 'Please enter a valid number');
                return;
            }
            if (enteredNumber < node.min && node.min != null) {
                interfaceContext.lightbox.post("Error", 'Number is below the minimum value of ' + node.min);
                return;
            }
            if (enteredNumber > node.max && node.max != null) {
                interfaceContext.lightbox.post("Error", 'Number is above the maximum value of ' + node.max);
                return;
            }
            node.response = input.value;
            // Perform the conditional
            for (var condition of node.specification.conditions) {
                var pass = false;
                switch (condition.check) {
                    case "contains":
                        console.log("Survey Element of type 'number' cannot interpret contains conditions. IGNORING");
                        break;
                    case "greaterThan":
                        if (node.response > Number(condition.value)) {
                            pass = true;
                        }
                        break;
                    case "lessThan":
                        if (node.response < Number(condition.value)) {
                            pass = true;
                        }
                        break;
                    case "equals":
                        if (node.response == condition.value) {
                            pass = true;
                        }
                        break;
                }
                var jumpID;
                if (pass) {
                    jumpID = condition.jumpToOnPass;
                } else {
                    jumpID = condition.jumpToOnFail;
                }
                if (jumpID != undefined) {
                    var index = this.popupOptions.findIndex(function (item, index, element) {
                        if (item.specification.id == jumpID) {
                            return true;
                        } else {
                            return false;
                        }
                    }, this);
                    this.currentIndex = index - 1;
                    break;
                }
            }
        } else if (node.specification.type == 'slider') {
            var input = this.popupContent.getElementsByTagName('input')[0];
            node.response = input.value;
            for (var condition of node.specification.conditions) {
                var pass = false;
                switch (condition.check) {
                    case "contains":
                        console.log("Survey Element of type 'number' cannot interpret contains conditions. IGNORING");
                        break;
                    case "greaterThan":
                        if (node.response > Number(condition.value)) {
                            pass = true;
                        }
                        break;
                    case "lessThan":
                        if (node.response < Number(condition.value)) {
                            pass = true;
                        }
                        break;
                    case "equals":
                        if (node.response == condition.value) {
                            pass = true;
                        }
                        break;
                }
                var jumpID;
                if (pass) {
                    jumpID = condition.jumpToOnPass;
                } else {
                    jumpID = condition.jumpToOnFail;
                }
                if (jumpID != undefined) {
                    var index = this.popupOptions.findIndex(function (item, index, element) {
                        if (item.specification.id == jumpID) {
                            return true;
                        } else {
                            return false;
                        }
                    }, this);
                    this.currentIndex = index - 1;
                    break;
                }
            }
        }
        this.currentIndex++;
        if (this.currentIndex < this.popupOptions.length) {
            this.postNode();
        } else {
            // Reached the end of the popupOptions
            this.popupTitle.textContent = "";
            this.popupResponse.innerHTML = "";
            this.hidePopup();
            for (var node of this.popupOptions) {
                this.store.postResult(node);
            }
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
        if (this.popup != null) {
            this.popup.style.left = (window.innerWidth / 2) - 250 + 'px';
            this.popup.style.top = (window.innerHeight / 2) - 125 + 'px';
            var blank = document.getElementsByClassName('testHalt')[0];
            blank.style.width = window.innerWidth;
            blank.style.height = window.innerHeight;
        }
    };
    this.hideNextButton = function () {
        this.buttonProceed.style.visibility = "hidden";
    }
    this.hidePreviousButton = function () {
        this.buttonPrevious.style.visibility = "hidden";
    }
    this.showNextButton = function () {
        this.buttonProceed.style.visibility = "visible";
    }
    this.showPreviousButton = function () {
        this.buttonPrevious.style.visibility = "visible";
    }
}

function advanceState() {
    // Just for complete clarity
    testState.advanceState();
}

function stateMachine() {
    // Object prototype for tracking and managing the test state
    this.stateMap = [];
    this.preTestSurvey = null;
    this.postTestSurvey = null;
    this.stateIndex = null;
    this.currentStateMap = null;
    this.currentStatePosition = null;
    this.currentStore = null;
    this.initialise = function () {

        // Get the data from Specification
        var pagePool = [];
        var pageInclude = [];
        for (var page of specification.pages) {
            if (page.alwaysInclude) {
                pageInclude.push(page);
            } else {
                pagePool.push(page);
            }
        }

        // Find how many are left to get
        var numPages = specification.poolSize;
        if (numPages > pagePool.length) {
            console.log("WARNING - You have specified more pages in <setup poolSize> than you have created!!");
            numPages = specification.pages.length;
        }
        if (specification.poolSize == 0) {
            numPages = specification.pages.length;
        }
        numPages -= pageInclude.length;

        if (numPages > 0) {
            // Go find the rest of the pages from the pool
            var subarr = null;
            if (specification.randomiseOrder) {
                // Append a random sub-array
                subarr = randomSubArray(pagePool, numPages);
            } else {
                // Append the matching number
                subarr = pagePool.slice(0, numPages);
            }
            pageInclude = pageInclude.concat(subarr);
        }

        // We now have our selected pages in pageInclude array
        if (specification.randomiseOrder) {
            pageInclude = randomiseOrder(pageInclude);
        }
        for (var i = 0; i < pageInclude.length; i++) {
            pageInclude[i].presentedId = i;
            this.stateMap.push(pageInclude[i]);
            // For each selected page, we must get the sub pool
            if (pageInclude[i].poolSize != 0 && pageInclude[i].poolSize != pageInclude[i].audioElements.length) {
                var elemInclude = [];
                var elemPool = [];
                for (var elem of pageInclude[i].audioElements) {
                    if (elem.include || elem.type != "normal") {
                        elemInclude.push(elem);
                    } else {
                        elemPool.push(elem);
                    }
                }
                var numElems = pageInclude[i].poolSize - elemInclude.length;
                pageInclude[i].audioElements = elemInclude.concat(randomSubArray(elemPool, numElems));
            }
            storage.createTestPageStore(pageInclude[i]);
            audioEngineContext.loadPageData(pageInclude[i]);
        }

        if (specification.preTest != null) {
            this.preTestSurvey = specification.preTest;
        }
        if (specification.postTest != null) {
            this.postTestSurvey = specification.postTest;
        }

        if (this.stateMap.length > 0) {
            if (this.stateIndex != null) {
                console.log('NOTE - State already initialise');
            }
            this.stateIndex = -2;
            console.log('Starting test...');
        } else {
            console.log('FATAL - StateMap not correctly constructed. EMPTY_STATE_MAP');
        }
    };
    this.advanceState = function () {
        if (this.stateIndex == null) {
            this.initialise();
        }
        if (this.stateIndex > -2) {
            storage.update();
        }
        if (this.stateIndex == -2) {
            this.stateIndex++;
            if (this.preTestSurvey != null) {
                popup.initState(this.preTestSurvey, storage.globalPreTest);
            } else {
                this.advanceState();
            }
        } else if (this.stateIndex == -1) {
            this.stateIndex++;
            if (specification.calibration) {
                popup.showPopup();
                popup.popupTitle.textContent = "Calibration. Set the levels so all tones are of equal amplitude. Move your mouse over the sliders to hear the tones. The red slider is the reference tone";
                interfaceContext.calibrationModuleObject = new interfaceContext.calibrationModule();
                interfaceContext.calibrationModuleObject.build(popup.popupResponse);
                popup.hidePreviousButton();
            } else {
                this.advanceState();
            }
        } else if (this.stateIndex == this.stateMap.length) {
            // All test pages complete, post test
            console.log('Ending test ...');
            this.stateIndex++;
            if (this.postTestSurvey == null) {
                this.advanceState();
            } else {
                popup.initState(this.postTestSurvey, storage.globalPostTest);
            }
        } else if (this.stateIndex > this.stateMap.length) {
            createProjectSave(specification.projectReturn);
        } else {
            popup.hidePopup();
            if (this.currentStateMap == null) {
                this.currentStateMap = this.stateMap[this.stateIndex];
                // Find and extract the outside reference
                var elements = [],
                    ref = [];
                var elem;
                while (elem = this.currentStateMap.audioElements.pop()) {
                    if (elem.type == "outside-reference") {
                        ref.push(elem);
                    } else {
                        elements.push(elem);
                    }
                }
                elements = elements.reverse();
                if (this.currentStateMap.randomiseOrder) {
                    elements = randomiseOrder(elements);
                }
                this.currentStateMap.audioElements = elements.concat(ref);

                this.currentStore = storage.testPages[this.stateIndex];
                if (this.currentStateMap.preTest != null) {
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
                    if (this.currentStateMap.postTest == null) {
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
            };
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
        for (var ao of audioEngineContext.audioObjects) {
            ao.exportXMLDOM();
        }
        for (var element of interfaceContext.commentQuestions) {
            element.exportXMLDOM(storePoint);
        }
        pageXMLSave(storePoint.XMLDOM, this.currentStateMap);
        storePoint.complete();
    };

    this.getCurrentTestPage = function () {
        if (this.stateIndex >= 0 && this.stateIndex < this.stateMap.length) {
            return this.currentStateMap;
        } else {
            return null;
        }
    }
    this.getCurrentTestPageStore = function () {
        if (this.stateIndex >= 0 && this.stateIndex < this.stateMap.length) {
            return this.currentStore;
        } else {
            return null;
        }
    }
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
                if (this.users[i].interfaceDOM != null) {
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
        }
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
                    if (decodedData.sampleRate !== audioContext.sampleRate) {
                        // Resample
                        var num_channels = decodedData.numberOfChannels,
                            num_samples = decodedData.length,
                            r = audioContext.sampleRate / decodedData.sampleRate,
                            new_buffer = audioContext.createBuffer(num_channels, Math.floor(num_samples * r), audioContext.sampleRate),
                            channel;
                        for (channel = 0; channel < num_channels; channel++) {
                            var buffer = new Float32Array(decodedData.length);
                            decodedData.copyFromChannel(buffer, channel);
                            buffer = xtract_resample(buffer, audioContext.sampleRate, decodedData.sampleRate);
                            new_buffer.copyToChannel(buffer, channel);
                        }
                        decodedData = new_buffer;
                        buffer = new_buffer = undefined;
                    }
                    self.buffer = decodedData;
                    self.status = 2;
                    calculateLoudness(self, "I");
                    return true;
                }, function (e) {
                    var waveObj = new WAVE();
                    if (waveObj.open(response) == 0) {
                        self.buffer = audioContext.createBuffer(waveObj.num_channels, waveObj.num_samples, waveObj.sample_rate);
                        for (var c = 0; c < waveObj.num_channels; c++) {
                            var buffer_ptr = self.buffer.getChannelData(c);
                            for (var n = 0; n < waveObj.num_samples; n++) {
                                buffer_ptr[n] = waveObj.decoded_data[c][n];
                            }
                        }

                        delete waveObj;
                    }
                    if (self.buffer != undefined) {
                        self.status = 2;
                        calculateLoudness(self, "I");
                        return true;
                    }
                    return false;
                });
            }

            // Create callback for any error in loading
            function processError() {
                this.status = -1;
                for (var i = 0; i < this.users.length; i++) {
                    this.users[i].state = -1;
                    if (this.users[i].interfaceDOM != null) {
                        this.users[i].bufferLoaded(this);
                    }
                }
                interfaceContext.lightbox.post("Error", "Could not load resource " + urls[currentUrlIndex].url);
            }

            function progressCallback(event) {
                if (event.lengthComputable) {
                    this.progress = event.loaded / event.total;
                    for (var i = 0; i < this.users.length; i++) {
                        if (this.users[i].interfaceDOM != null) {
                            if (typeof this.users[i].interfaceDOM.updateLoading === "function") {
                                this.users[i].interfaceDOM.updateLoading(this.progress * 100);
                            }
                        }
                    }
                }
            };

            this.progress = 0;
            this.status = 1;
            currentUrlIndex = 0;
            get(urls[0].url).then(processAudio.bind(self)).catch(getNextURL.bind(self));
        };

        this.registerAudioObject = function (audioObject) {
            // Called by an audioObject to register to the buffer for use
            // First check if already in the register pool
            for (var objects of this.users) {
                if (audioObject.id == objects.id) {
                    return 0;
                }
            }
            this.users.push(audioObject);
            if (this.status == 3 || this.status == -1) {
                // The buffer is already ready, trigger bufferLoaded
                audioObject.bufferLoaded(this);
            }
        };

        this.copyBuffer = function (preSilenceTime, postSilenceTime) {
            // Copies the entire bufferObj.
            if (preSilenceTime == undefined) {
                preSilenceTime = 0;
            }
            if (postSilenceTime == undefined) {
                postSilenceTime = 0;
            }
            var preSilenceSamples = secondsToSamples(preSilenceTime, this.buffer.sampleRate);
            var postSilenceSamples = secondsToSamples(postSilenceTime, this.buffer.sampleRate);
            var newLength = this.buffer.length + preSilenceSamples + postSilenceSamples;
            var copybuffer = audioContext.createBuffer(this.buffer.numberOfChannels, newLength, this.buffer.sampleRate);
            // Now we can use some efficient background copy schemes if we are just padding the end
            if (preSilenceSamples == 0 && typeof copybuffer.copyToChannel == "function") {
                for (var c = 0; c < this.buffer.numberOfChannels; c++) {
                    copybuffer.copyToChannel(this.buffer.getChannelData(c), c);
                }
            } else {
                for (var c = 0; c < this.buffer.numberOfChannels; c++) {
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
        }

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
        }
    };

    this.loadPageData = function (page) {
        // Load the URL from pages
        for (var element of page.audioElements) {
            var URL = page.hostURL + element.url;
            var buffer = null;
            for (var buffObj of this.buffers) {
                if (buffObj.hasUrl(URL)) {
                    buffer = buffObj;
                    break;
                }
            }
            if (buffer == null) {
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
    };

    this.play = function (id) {
        // Start the timer and set the audioEngine state to playing (1)
        if (this.status == 0) {
            // Check if all audioObjects are ready
            this.bufferReady(id);
        } else {
            this.status = 1;
        }
        if (this.status == 1) {
            this.timer.startTest();
            if (id == undefined) {
                id = -1;
                console.error('FATAL - Passed id was undefined - AudioEngineContext.play(id)');
                return;
            } else {
                interfaceContext.playhead.setTimePerPixel(this.audioObjects[id]);
            }
            var setTime = audioContext.currentTime;
            if (this.synchPlayback && this.loopPlayback) {
                // Traditional looped playback
                for (var i = 0; i < this.audioObjects.length; i++) {
                    this.audioObjects[i].play(audioContext.currentTime);
                    if (id == i) {
                        this.audioObjects[i].loopStart(setTime);
                    } else {
                        this.audioObjects[i].loopStop(setTime + specification.crossFade);
                    }
                }
            } else {
                for (var i = 0; i < this.audioObjects.length; i++) {
                    if (i != id) {
                        this.audioObjects[i].stop(setTime + specification.crossFade);
                    } else if (i == id) {
                        this.audioObjects[id].play(setTime);
                    }
                }
            }
            interfaceContext.playhead.start();
        }
    };

    this.stop = function () {
        // Send stop and reset command to all playback buffers
        if (this.status == 1) {
            var setTime = audioContext.currentTime + 0.1;
            for (var i = 0; i < this.audioObjects.length; i++) {
                this.audioObjects[i].stop(setTime);
            }
            interfaceContext.playhead.stop();
        }
    };

    this.newTrack = function (element) {
        // Pull data from given URL into new audio buffer
        // URLs must either be from the same source OR be setup to 'Access-Control-Allow-Origin'

        // Create the audioObject with ID of the new track length;
        audioObjectId = this.audioObjects.length;
        this.audioObjects[audioObjectId] = new audioObject(audioObjectId);

        // Check if audioObject buffer is currently stored by full URL
        var URL = testState.currentStateMap.hostURL + element.url;
        var buffer = null;
        for (var i = 0; i < this.buffers.length; i++) {
            if (this.buffers[i].hasUrl(URL)) {
                buffer = this.buffers[i];
                break;
            }
        }
        if (buffer == null) {
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
        for (var i = 0; i < this.buffers.length; i++) {
            this.buffers[i].users = [];
        }
        this.audioObjects = [];
        this.timer = new timer();
        this.loopPlayback = audioHolderObject.loop;
        this.synchPlayback = audioHolderObject.synchronous;
    };

    this.checkAllPlayed = function () {
        arr = [];
        for (var id = 0; id < this.audioObjects.length; id++) {
            if (this.audioObjects[id].metric.wasListenedTo == false) {
                arr.push(this.audioObjects[id].id);
            }
        }
        return arr;
    };

    this.checkAllReady = function () {
        var ready = true;
        for (var i = 0; i < this.audioObjects.length; i++) {
            if (this.audioObjects[i].state == 0) {
                // Track not ready
                console.log('WAIT -- audioObject ' + i + ' not ready yet!');
                ready = false;
            };
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
        for (var ao of this.audioObjects) {
            if (ao.buffer.buffer.duration !== duration) {
                ao.buffer.buffer = ao.buffer.copyBuffer(0, duration - ao.buffer.buffer.duration);
            }
        }
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
    }

    this.exportXML = function () {

    };

}

function audioObject(id) {
    // The main buffer object with common control nodes to the AudioEngine

    this.specification;
    this.id = id;
    this.state = 0; // 0 - no data, 1 - ready
    this.url = null; // Hold the URL given for the output back to the results.
    this.metric = new metricTracker(this);
    this.storeDOM = null;

    // Bindings for GUI
    this.interfaceDOM = null;
    this.commentDOM = null;

    // Create a buffer and external gain control to allow internal patching of effects and volume leveling.
    this.bufferNode = undefined;
    this.outputGain = audioContext.createGain();

    this.onplayGain = 1.0;

    // Connect buffer to the audio graph
    this.outputGain.connect(audioEngineContext.outputGain);
    audioEngineContext.nullBufferSource.connect(this.outputGain);

    // the audiobuffer is not designed for multi-start playback
    // When stopeed, the buffer node is deleted and recreated with the stored buffer.
    this.buffer;

    this.bufferLoaded = function (callee) {
        // Called by the associated buffer when it has finished loading, will then 'bind' the buffer to the
        // audioObject and trigger the interfaceDOM.enable() function for user feedback
        if (callee.status == -1) {
            // ERROR
            this.state = -1;
            if (this.interfaceDOM != null) {
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
        if (preSilenceTime != 0 || postSilenceTime != 0) {
            copybuffer.buffer = copybuffer.copyBuffer(preSilenceTime, postSilenceTime);
        }

        copybuffer.lufs = callee.buffer.lufs;
        this.buffer = copybuffer;

        var targetLUFS = this.specification.parent.loudness || specification.loudness;
        if (typeof targetLUFS === "number" && isFinite(targetLUFS)) {
            this.buffer.buffer.playbackGain = decibelToLinear(targetLUFS - this.buffer.buffer.lufs);
        } else {
            this.buffer.buffer.playbackGain = 1.0;
        }
        if (this.interfaceDOM != null) {
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
        this.storeDOM.setAttribute('presentedId', interfaceObject.getPresentedId());
    };

    this.loopStart = function (setTime) {
        this.outputGain.gain.linearRampToValueAtTime(this.onplayGain, setTime);
        this.metric.startListening(audioEngineContext.timer.getTestTime());
        this.interfaceDOM.startPlayback();
    };

    this.loopStop = function (setTime) {
        if (this.outputGain.gain.value != 0.0) {
            this.outputGain.gain.linearRampToValueAtTime(0.0, setTime);
            this.metric.stopListening(audioEngineContext.timer.getTestTime());
        }
        this.interfaceDOM.stopPlayback();
    };

    this.play = function (startTime) {
        if (this.bufferNode == undefined && this.buffer.buffer != undefined) {
            this.bufferNode = audioContext.createBufferSource();
            this.bufferNode.owner = this;
            this.bufferNode.connect(this.outputGain);
            this.bufferNode.buffer = this.buffer.buffer;
            this.bufferNode.loop = audioEngineContext.loopPlayback;
            this.bufferNode.onended = function (event) {
                // Safari does not like using 'this' to reference the calling object!
                //event.currentTarget.owner.metric.stopListening(audioEngineContext.timer.getTestTime(),event.currentTarget.owner.getCurrentPosition());
                if (event.currentTarget != null) {
                    event.currentTarget.owner.stop(audioContext.currentTime + 1);
                }
            };
            this.outputGain.gain.cancelScheduledValues(audioContext.currentTime);
            if (!audioEngineContext.loopPlayback || !audioEngineContext.synchPlayback) {
                this.metric.startListening(audioEngineContext.timer.getTestTime());
                this.outputGain.gain.linearRampToValueAtTime(this.onplayGain, startTime + specification.crossFade);
                this.interfaceDOM.startPlayback();
            } else {
                this.outputGain.gain.linearRampToValueAtTime(0.0, startTime);
            }
            if (audioEngineContext.loopPlayback) {
                this.bufferNode.loopStart = this.specification.startTime || 0;
                this.bufferNode.loopEnd = this.specification.stopTime - this.specification.startTime || this.buffer.buffer.duration;
                this.bufferNode.start(startTime);
            } else {
                this.bufferNode.start(startTime, this.specification.startTime || 0, this.specification.stopTime - this.specification.startTime || this.buffer.buffer.duration);
            }
            this.bufferNode.playbackStartTime = audioEngineContext.timer.getTestTime();
        }
    };

    this.stop = function (stopTime) {
        this.outputGain.gain.cancelScheduledValues(audioContext.currentTime);
        if (this.bufferNode != undefined) {
            this.metric.stopListening(audioEngineContext.timer.getTestTime(), this.getCurrentPosition());
            this.bufferNode.stop(stopTime);
            this.bufferNode = undefined;
        }
        this.outputGain.gain.linearRampToValueAtTime(0.0, stopTime);
        this.interfaceDOM.stopPlayback();
    };

    this.getCurrentPosition = function () {
        var time = audioEngineContext.timer.getTestTime();
        if (this.bufferNode != undefined) {
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
            if (interfaceXML != null) {
                if (interfaceXML.length == undefined) {
                    this.storeDOM.appendChild(interfaceXML);
                } else {
                    for (var i = 0; i < interfaceXML.length; i++) {
                        this.storeDOM.appendChild(interfaceXML[i]);
                    }
                }
            }
            if (this.commentDOM != null) {
                this.storeDOM.appendChild(this.commentDOM.exportXMLDOM(this));
            }
        }
        var nodes = this.metric.exportXMLDOM();
        var mroot = this.storeDOM.getElementsByTagName('metric')[0];
        for (var i = 0; i < nodes.length; i++) {
            mroot.appendChild(nodes[i]);
        }
    };
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
        if (this.testStarted == false) {
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
        if (time > 0) {
            this.wasMoved = true;
        }
        this.movementTracker[this.movementTracker.length] = [time, position];
    };

    this.startListening = function (time) {
        if (this.listenHold == false) {
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
        if (this.listenHold == true) {
            var diff = time - this.listenStart;
            this.listenedTimer += (diff);
            this.listenStart = 0;
            this.listenHold = false;

            var evnt = this.listenTracker[this.listenTracker.length - 1];
            var testTime = evnt.getElementsByTagName('testTime')[0];
            var bufferTime = evnt.getElementsByTagName('bufferTime')[0];
            testTime.setAttribute('stop', time);
            if (bufferStopTime == undefined) {
                bufferTime.setAttribute('stop', this.parent.getCurrentPosition());
            } else {
                bufferTime.setAttribute('stop', bufferStopTime);
            }
            console.log('slider ' + this.parent.id + ' played for (' + diff + ')'); // DEBUG/SAFETY: show played slider id
        }
    };

    this.exportXMLDOM = function () {
        var storeDOM = [];
        if (audioEngineContext.metric.enableElementTimer) {
            var mElementTimer = storage.document.createElement('metricresult');
            mElementTimer.setAttribute('name', 'enableElementTimer');
            mElementTimer.textContent = this.listenedTimer;
            storeDOM.push(mElementTimer);
        }
        if (audioEngineContext.metric.enableElementTracker) {
            var elementTrackerFull = storage.document.createElement('metricresult');
            elementTrackerFull.setAttribute('name', 'elementTrackerFull');
            for (var k = 0; k < this.movementTracker.length; k++) {
                var timePos = storage.document.createElement('movement');
                timePos.setAttribute("time", this.movementTracker[k][0]);
                timePos.setAttribute("value", this.movementTracker[k][1]);
                elementTrackerFull.appendChild(timePos);
            }
            storeDOM.push(elementTrackerFull);
        }
        if (audioEngineContext.metric.enableElementListenTracker) {
            var elementListenTracker = storage.document.createElement('metricresult');
            elementListenTracker.setAttribute('name', 'elementListenTracker');
            for (var k = 0; k < this.listenTracker.length; k++) {
                elementListenTracker.appendChild(this.listenTracker[k]);
            }
            storeDOM.push(elementListenTracker);
        }
        if (audioEngineContext.metric.enableElementInitialPosition) {
            var elementInitial = storage.document.createElement('metricresult');
            elementInitial.setAttribute('name', 'elementInitialPosition');
            elementInitial.textContent = this.initialPosition;
            storeDOM.push(elementInitial);
        }
        if (audioEngineContext.metric.enableFlagListenedTo) {
            var flagListenedTo = storage.document.createElement('metricresult');
            flagListenedTo.setAttribute('name', 'elementFlagListenedTo');
            flagListenedTo.textContent = this.wasListenedTo;
            storeDOM.push(flagListenedTo);
        }
        if (audioEngineContext.metric.enableFlagMoved) {
            var flagMoved = storage.document.createElement('metricresult');
            flagMoved.setAttribute('name', 'elementFlagMoved');
            flagMoved.textContent = this.wasMoved;
            storeDOM.push(flagMoved);
        }
        if (audioEngineContext.metric.enableFlagComments) {
            var flagComments = storage.document.createElement('metricresult');
            flagComments.setAttribute('name', 'elementFlagComments');
            if (this.parent.commentDOM == null) {
                flag.textContent = 'false';
            } else if (this.parent.commentDOM.textContent.length == 0) {
                flag.textContent = 'false';
            } else {
                flag.textContet = 'true';
            }
            storeDOM.push(flagComments);
        }
        return storeDOM;
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

    // Bounded by interface!!
    // Interface object MUST have an exportXMLDOM method which returns the various DOM levels
    // For example, APE returns  the slider position normalised in a <value> tag.
    this.interfaceObjects = [];
    this.interfaceObject = function () {};

    this.resizeWindow = function (event) {
        popup.resize(event);
        this.volume.resize();
        this.lightbox.resize();
        for (var i = 0; i < this.commentBoxes.length; i++) {
            this.commentBoxes[i].resize();
        }
        for (var i = 0; i < this.commentQuestions.length; i++) {
            this.commentQuestions[i].resize();
        }
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

    }

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
        }
    }

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

    this.commentBoxes = new function () {
        this.boxes = [];
        this.injectPoint = null;
        this.elementCommentBox = function (audioObject) {
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
        };
        this.createCommentBox = function (audioObject) {
            var node = new this.elementCommentBox(audioObject);
            this.boxes.push(node);
            audioObject.commentDOM = node;
            return node;
        };
        this.sortCommentBoxes = function () {
            this.boxes.sort(function (a, b) {
                return a.id - b.id;
            });
        };

        this.showCommentBoxes = function (inject, sort) {
            this.injectPoint = inject;
            if (sort) {
                this.sortCommentBoxes();
            }
            for (var box of this.boxes) {
                inject.appendChild(box.trackComment);
            }
        };

        this.deleteCommentBoxes = function () {
            if (this.injectPoint != null) {
                for (var box of this.boxes) {
                    this.injectPoint.removeChild(box.trackComment);
                }
                this.injectPoint = null;
            }
            this.boxes = [];
        };
    }

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
    };

    this.radioBox = function (commentQuestion) {
        this.specification = commentQuestion;
        // Create document objects to hold the comment boxes
        this.holder = document.createElement('div');
        this.holder.className = 'comment-div';
        // Create a string next to each comment asking for a comment
        this.string = document.createElement('span');
        this.string.innerHTML = commentQuestion.statement;
        var br = document.createElement('br');
        // Add to the holder.
        this.holder.appendChild(this.string);
        this.holder.appendChild(br);
        this.options = [];
        this.inputs = document.createElement('div');
        this.span = document.createElement('div');
        this.inputs.align = 'center';
        this.inputs.style.marginLeft = '12px';
        this.inputs.className = "comment-radio-inputs-holder";
        this.span.style.marginLeft = '12px';
        this.span.align = 'center';
        this.span.style.marginTop = '15px';
        this.span.className = "comment-radio-span-holder";

        var optCount = commentQuestion.options.length;
        for (var optNode of commentQuestion.options) {
            var div = document.createElement('div');
            div.style.width = '80px';
            div.style.float = 'left';
            var input = document.createElement('input');
            input.type = 'radio';
            input.name = commentQuestion.id;
            input.setAttribute('setvalue', optNode.name);
            input.className = 'comment-radio';
            div.appendChild(input);
            this.inputs.appendChild(div);


            div = document.createElement('div');
            div.style.width = '80px';
            div.style.float = 'left';
            div.align = 'center';
            var span = document.createElement('span');
            span.textContent = optNode.text;
            span.className = 'comment-radio-span';
            div.appendChild(span);
            this.span.appendChild(div);
            this.options.push(input);
        }
        this.holder.appendChild(this.span);
        this.holder.appendChild(this.inputs);

        this.exportXMLDOM = function (storePoint) {
            var root = storePoint.parent.document.createElement('comment');
            root.id = this.specification.id;
            root.setAttribute('type', this.specification.type);
            var question = document.createElement('question');
            question.textContent = this.string.textContent;
            var response = document.createElement('response');
            var i = 0;
            while (this.options[i].checked == false) {
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
            var text = this.holder.getElementsByClassName("comment-radio-span-holder")[0];
            var options = this.holder.getElementsByClassName("comment-radio-inputs-holder")[0];
            var optCount = options.childElementCount;
            var spanMargin = Math.floor(((boxwidth - 20 - (optCount * 80)) / (optCount)) / 2) + 'px';
            var options = options.firstChild;
            var text = text.firstChild;
            options.style.marginRight = spanMargin;
            options.style.marginLeft = spanMargin;
            text.style.marginRight = spanMargin;
            text.style.marginLeft = spanMargin;
            while (options.nextSibling != undefined) {
                options = options.nextSibling;
                text = text.nextSibling;
                options.style.marginRight = spanMargin;
                options.style.marginLeft = spanMargin;
                text.style.marginRight = spanMargin;
                text.style.marginLeft = spanMargin;
            }
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
        var br = document.createElement('br');
        // Add to the holder.
        this.holder.appendChild(this.string);
        this.holder.appendChild(br);
        this.options = [];
        this.inputs = document.createElement('div');
        this.span = document.createElement('div');
        this.inputs.align = 'center';
        this.inputs.style.marginLeft = '12px';
        this.inputs.className = "comment-checkbox-inputs-holder";
        this.span.style.marginLeft = '12px';
        this.span.align = 'center';
        this.span.style.marginTop = '15px';
        this.span.className = "comment-checkbox-span-holder";

        var optCount = commentQuestion.options.length;
        for (var i = 0; i < optCount; i++) {
            var div = document.createElement('div');
            div.style.width = '80px';
            div.style.float = 'left';
            var input = document.createElement('input');
            input.type = 'checkbox';
            input.name = commentQuestion.id;
            input.setAttribute('setvalue', commentQuestion.options[i].name);
            input.className = 'comment-radio';
            div.appendChild(input);
            this.inputs.appendChild(div);


            div = document.createElement('div');
            div.style.width = '80px';
            div.style.float = 'left';
            div.align = 'center';
            var span = document.createElement('span');
            span.textContent = commentQuestion.options[i].text;
            span.className = 'comment-radio-span';
            div.appendChild(span);
            this.span.appendChild(div);
            this.options.push(input);
        }
        this.holder.appendChild(this.span);
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
            var text = this.holder.getElementsByClassName("comment-checkbox-span-holder")[0];
            var options = this.holder.getElementsByClassName("comment-checkbox-inputs-holder")[0];
            var optCount = options.childElementCount;
            var spanMargin = Math.floor(((boxwidth - 20 - (optCount * 80)) / (optCount)) / 2) + 'px';
            var options = options.firstChild;
            var text = text.firstChild;
            options.style.marginRight = spanMargin;
            options.style.marginLeft = spanMargin;
            text.style.marginRight = spanMargin;
            text.style.marginLeft = spanMargin;
            while (options.nextSibling != undefined) {
                options = options.nextSibling;
                text = text.nextSibling;
                options.style.marginRight = spanMargin;
                options.style.marginLeft = spanMargin;
                text.style.marginRight = spanMargin;
                text.style.marginLeft = spanMargin;
            }
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

    this.outsideReferenceDOM = function (audioObject, index, inject) {
        this.parent = audioObject;
        this.outsideReferenceHolder = document.createElement('button');
        this.outsideReferenceHolder.className = 'outside-reference';
        this.outsideReferenceHolder.setAttribute('track-id', index);
        this.outsideReferenceHolder.textContent = this.parent.specification.label || "Reference";
        this.outsideReferenceHolder.disabled = true;

        this.outsideReferenceHolder.onclick = function (event) {
            audioEngineContext.play(event.currentTarget.getAttribute('track-id'));
        };
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
        }
    }

    this.playhead = new function () {
        this.object = document.createElement('div');
        this.object.className = 'playhead';
        this.object.align = 'left';
        var curTime = document.createElement('div');
        curTime.style.width = '50px';
        this.curTimeSpan = document.createElement('span');
        this.curTimeSpan.textContent = '00:00';
        curTime.appendChild(this.curTimeSpan);
        this.object.appendChild(curTime);
        this.scrubberTrack = document.createElement('div');
        this.scrubberTrack.className = 'playhead-scrub-track';

        this.scrubberHead = document.createElement('div');
        this.scrubberHead.id = 'playhead-scrubber';
        this.scrubberTrack.appendChild(this.scrubberHead);
        this.object.appendChild(this.scrubberTrack);

        this.timePerPixel = 0;
        this.maxTime = 0;

        this.playbackObject;

        this.setTimePerPixel = function (audioObject) {
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

        this.update = function () {
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
        };

        this.interval = undefined;

        this.start = function () {
            if (this.playbackObject != undefined && this.interval == undefined) {
                if (this.maxTime < 60) {
                    this.interval = setInterval(function () {
                        interfaceContext.playhead.update();
                    }, 10);
                } else {
                    this.interval = setInterval(function () {
                        interfaceContext.playhead.update();
                    }, 100);
                }
            }
        };
        this.stop = function () {
            clearInterval(this.interval);
            this.interval = undefined;
            this.scrubberHead.style.left = '0px';
            if (this.maxTime < 60) {
                this.curTimeSpan.textContent = '0.00';
            } else {
                this.curTimeSpan.textContent = '00:00';
            }
        };
    };

    this.volume = new function () {
        // An in-built volume module which can be viewed on page
        // Includes trackers on page-by-page data
        // Volume does NOT reset to 0dB on each page load
        this.valueLin = 1.0;
        this.valueDB = 0.0;
        this.root = document.createElement('div');
        this.root.id = 'master-volume-root';
        this.object = document.createElement('div');
        this.object.className = 'master-volume-holder-float';
        this.object.appendChild(this.root);
        this.slider = document.createElement('input');
        this.slider.id = 'master-volume-control';
        this.slider.type = 'range';
        this.valueText = document.createElement('span');
        this.valueText.id = 'master-volume-feedback';
        this.valueText.textContent = '0dB';

        this.slider.min = -60;
        this.slider.max = 12;
        this.slider.value = 0;
        this.slider.step = 1;
        this.slider.onmousemove = function (event) {
            interfaceContext.volume.valueDB = event.currentTarget.value;
            interfaceContext.volume.valueLin = decibelToLinear(interfaceContext.volume.valueDB);
            interfaceContext.volume.valueText.textContent = interfaceContext.volume.valueDB + 'dB';
            audioEngineContext.outputGain.gain.value = interfaceContext.volume.valueLin;
        }
        this.slider.onmouseup = function (event) {
            var storePoint = testState.currentStore.XMLDOM.getElementsByTagName('metric')[0].getAllElementsByName('volumeTracker');
            if (storePoint.length == 0) {
                storePoint = storage.document.createElement('metricresult');
                storePoint.setAttribute('name', 'volumeTracker');
                testState.currentStore.XMLDOM.getElementsByTagName('metric')[0].appendChild(storePoint);
            } else {
                storePoint = storePoint[0];
            }
            var node = storage.document.createElement('movement');
            node.setAttribute('test-time', audioEngineContext.timer.getTestTime());
            node.setAttribute('volume', interfaceContext.volume.valueDB);
            node.setAttribute('format', 'dBFS');
            storePoint.appendChild(node);
        }

        var title = document.createElement('div');
        title.innerHTML = '<span>Master Volume Control</span>';
        title.style.fontSize = '0.75em';
        title.style.width = "100%";
        title.align = 'center';
        this.root.appendChild(title);

        this.root.appendChild(this.slider);
        this.root.appendChild(this.valueText);

        this.resize = function (event) {
            if (window.innerWidth < 1000) {
                this.object.className = "master-volume-holder-inline"
            } else {
                this.object.className = 'master-volume-holder-float';
            }
        }
    }

    this.calibrationModuleObject = null;
    this.calibrationModule = function () {
        // This creates an on-page calibration module
        this.storeDOM = storage.document.createElement("calibration");
        storage.root.appendChild(this.storeDOM);
        // The calibration is a fixed state module
        this.calibrationNodes = [];
        this.holder = null;
        this.build = function (inject) {
            var f0 = 62.5;
            this.holder = document.createElement("div");
            this.holder.className = "calibration-holder";
            this.calibrationNodes = [];
            while (f0 < 20000) {
                var obj = {
                    root: document.createElement("div"),
                    input: document.createElement("input"),
                    oscillator: audioContext.createOscillator(),
                    gain: audioContext.createGain(),
                    f: f0,
                    parent: this,
                    handleEvent: function (event) {
                        switch (event.type) {
                            case "mouseenter":
                                this.oscillator.start(0);
                                break;
                            case "mouseleave":
                                this.oscillator.stop(0);
                                this.oscillator = audioContext.createOscillator();
                                this.oscillator.connect(this.gain);
                                this.oscillator.frequency.value = this.f;
                                break;
                            case "mousemove":
                                var value = Math.pow(10, this.input.value / 20);
                                if (this.f == 1000) {
                                    audioEngineContext.outputGain.gain.value = value;
                                    interfaceContext.volume.slider.value = this.input.value;
                                } else {
                                    this.gain.gain.value = value
                                }
                                break;
                        }
                    },
                    disconnect: function () {
                        this.gain.disconnect();
                    }
                }
                obj.root.className = "calibration-slider";
                obj.root.appendChild(obj.input);
                obj.oscillator.connect(obj.gain);
                obj.gain.connect(audioEngineContext.outputGain);
                obj.gain.gain.value = Math.random() * 2;
                obj.input.value = obj.gain.gain.value;
                obj.input.setAttribute('orient', 'vertical');
                obj.input.type = "range";
                obj.input.min = -12;
                obj.input.max = 0;
                obj.input.step = 0.25;
                if (f0 != 1000) {
                    obj.input.value = (Math.random() * 12) - 6;
                } else {
                    obj.input.value = 0;
                    obj.root.style.backgroundColor = "rgb(255,125,125)";
                }
                obj.input.addEventListener("mousemove", obj);
                obj.input.addEventListener("mouseenter", obj);
                obj.input.addEventListener("mouseleave", obj);
                obj.gain.gain.value = Math.pow(10, obj.input.value / 20);
                obj.oscillator.frequency.value = f0;
                this.calibrationNodes.push(obj);
                this.holder.appendChild(obj.root);
                f0 *= 2;
            }
            inject.appendChild(this.holder);
        }
        this.collect = function () {
            for (var obj of this.calibrationNodes) {
                var node = storage.document.createElement("calibrationresult");
                node.setAttribute("frequency", obj.f);
                node.setAttribute("range-min", obj.input.min);
                node.setAttribute("range-max", obj.input.max);
                node.setAttribute("gain-lin", obj.gain.gain.value);
                this.storeDOM.appendChild(node);
            }
        }
    }


    // Global Checkers
    // These functions will help enforce the checkers
    this.checkHiddenAnchor = function () {
        for (var ao of audioEngineContext.audioObjects) {
            if (ao.specification.type == "anchor") {
                if (ao.interfaceDOM.getValue() > (ao.specification.marker / 100) && ao.specification.marker > 0) {
                    // Anchor is not set below
                    console.log('Anchor node not below marker value');
                    interfaceContext.lightbox.post("Message", 'Please keep listening');
                    this.storeErrorNode('Anchor node not below marker value');
                    return false;
                }
            }
        }
        return true;
    };

    this.checkHiddenReference = function () {
        for (var ao of audioEngineContext.audioObjects) {
            if (ao.specification.type == "reference") {
                if (ao.interfaceDOM.getValue() < (ao.specification.marker / 100) && ao.specification.marker > 0) {
                    // Anchor is not set below
                    console.log('Reference node not above marker value');
                    this.storeErrorNode('Reference node not above marker value');
                    interfaceContext.lightbox.post("Message", 'Please keep listening');
                    return false;
                }
            }
        }
        return true;
    };

    this.checkFragmentsFullyPlayed = function () {
        // Checks the entire file has been played back
        // NOTE ! This will return true IF playback is Looped!!!
        if (audioEngineContext.loopPlayback) {
            console.log("WARNING - Looped source: Cannot check fragments are fully played");
            return true;
        }
        var check_pass = true;
        var error_obj = [];
        for (var i = 0; i < audioEngineContext.audioObjects.length; i++) {
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
            if (passed == false) {
                check_pass = false;
                console.log("Continue listening to track-" + object.interfaceDOM.getPresentedId());
                error_obj.push(object.interfaceDOM.getPresentedId());
            }
        }
        if (check_pass == false) {
            var str_start = "You have not completely listened to fragments ";
            for (var i = 0; i < error_obj.length; i++) {
                str_start += error_obj[i];
                if (i != error_obj.length - 1) {
                    str_start += ', ';
                }
            }
            str_start += ". Please keep listening";
            console.log("[ALERT]: " + str_start);
            this.storeErrorNode("[ALERT]: " + str_start);
            interfaceContext.lightbox.post("Error", str_start);
            return false;
        }
        return true;
    };
    this.checkAllMoved = function () {
        var str = "You have not moved ";
        var failed = [];
        for (var ao of audioEngineContext.audioObjects) {
            if (ao.metric.wasMoved == false && ao.interfaceDOM.canMove() == true) {
                failed.push(ao.interfaceDOM.getPresentedId());
            }
        }
        if (failed.length == 0) {
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
        interfaceContext.lightbox.post("Error", str);
        console.log(str);
        this.storeErrorNode(str);
        return false;
    };
    this.checkAllPlayed = function () {
        var str = "You have not played ";
        var failed = [];
        for (var ao of audioEngineContext.audioObjects) {
            if (ao.metric.wasListenedTo == false) {
                failed.push(ao.interfaceDOM.getPresentedId());
            }
        }
        if (failed.length == 0) {
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
        interfaceContext.lightbox.post("Error", str);
        console.log(str);
        this.storeErrorNode(str);
        return false;
    };
    this.checkAllCommented = function () {
        var str = "You have not commented on all the fragments.";
        var cont = true,
            boxes = this.commentBoxes.boxes,
            numBoxes = boxes.length,
            i;
        for (i = 0; i < numBoxes; i++) {
            if (boxes[i].trackCommentBox.value === "") {
                interfaceContext.lightbox.post("Error", str);
                console.log(str);
                this.storeErrorNode(str);
                return false;
            }
        }
        return true;
    }
    this.checkScaleRange = function (min, max) {
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
        if (minRanking * 100 > min) {
            str += "At least one fragment must be below the " + min + " mark.";
            state = false;
        }
        if (maxRanking * 100 < max) {
            str += "At least one fragment must be above the " + max + " mark."
            state = false;
        }
        if (!state) {
            console.log(str);
            this.storeErrorNode(str);
            interfaceContext.lightbox.post("Error", str);
        }
        return state;
    }

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
                    if (index == 0) {
                        return "Same";
                    } else if (index == 1) {
                        return "Difference";
                    } else {
                        return "";
                    }
                case "number":
                    return String(index + offset);
                default:
                    return "";
            }
        }

        if (typeof labelStart !== "string" || labelStart.length == 0) {
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
            case "none":
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
    }
}

function Storage() {
    // Holds results in XML format until ready for collection
    this.globalPreTest = null;
    this.globalPostTest = null;
    this.testPages = [];
    this.document = null;
    this.root = null;
    this.state = 0;

    this.initialise = function (existingStore) {
        if (existingStore == undefined) {
            // We need to get the sessionKey
            this.SessionKey.requestKey();
            this.document = document.implementation.createDocument(null, "waetresult", null);
            this.root = this.document.childNodes[0];
            var projectDocument = specification.projectXML;
            projectDocument.setAttribute('file-name', url);
            projectDocument.setAttribute('url', qualifyURL(url));
            this.root.appendChild(projectDocument);
            this.root.appendChild(interfaceContext.returnDateNode());
            this.root.appendChild(interfaceContext.returnNavigator());
        } else {
            this.document = existingStore;
            this.root = existingStore.firstChild;
            this.SessionKey.key = this.root.getAttribute("key");
        }
        if (specification.preTest != undefined) {
            this.globalPreTest = new this.surveyNode(this, this.root, specification.preTest);
        }
        if (specification.postTest != undefined) {
            this.globalPostTest = new this.surveyNode(this, this.root, specification.postTest);
        }
    };

    this.SessionKey = {
        key: null,
        request: new XMLHttpRequest(),
        parent: this,
        handleEvent: function () {
            var parse = new DOMParser();
            var xml = parse.parseFromString(this.request.response, "text/xml");
            if (this.request.response.length == 0) {
                console.error("An unspecified error occured, no server key could be generated");
                return;
            }
            if (xml.getElementsByTagName("state").length > 0) {
                if (xml.getElementsByTagName("state")[0].textContent == "OK") {
                    this.key = xml.getAllElementsByTagName("key")[0].textContent;
                    this.parent.root.setAttribute("key", this.key);
                    this.parent.root.setAttribute("state", "empty");
                    this.update();
                    return;
                } else if (xml.getElementsByTagName("state")[0].textContent == "ERROR") {
                    this.key = null;
                    console.error("Could not generate server key. Server responded with error message: \"" + xml.getElementsByTagName("message")[0].textContent + "\"");
                    return;
                }
            }
            this.key = null;
            console.error("An unspecified error occured, no server key could be generated");
        },
        requestKey: function () {
            // For new servers, request a new key from the server
            var returnURL = "";
            if (typeof specification.projectReturn == "string") {
                if (specification.projectReturn.substr(0, 4) == "http") {
                    returnURL = specification.projectReturn;
                }
            }
            this.request.open("GET", returnURL + "php/requestKey.php", true);
            this.request.addEventListener("load", this);
            this.request.send();
        },
        update: function () {
            if (this.key == null) {
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
            xmlhttp.open("POST", returnURL + "php/save.php?key=" + this.key);
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
            }
            xmlhttp.send([hold.innerHTML]);
        }
    }

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
        for (var optNode of this.specification.options) {
            if (optNode.type != 'statement') {
                var node = this.parent.document.createElement('surveyresult');
                node.setAttribute("ref", optNode.id);
                node.setAttribute('type', optNode.type);
                this.XMLDOM.appendChild(node);
            }
        }
        root.appendChild(this.XMLDOM);

        this.postResult = function (node) {
            // From popup: node is the popupOption node containing both spec. and results
            // ID is the position
            if (node.specification.type == 'statement') {
                return;
            }
            var surveyresult = this.XMLDOM.firstChild;
            while (surveyresult != null) {
                if (surveyresult.getAttribute("ref") == node.specification.id) {
                    break;
                }
                surveyresult = surveyresult.nextElementSibling;
            }
            switch (node.specification.type) {
                case "number":
                case "question":
                case "slider":
                    var child = this.parent.document.createElement('response');
                    child.textContent = node.response;
                    surveyresult.appendChild(child);
                    break;
                case "radio":
                    var child = this.parent.document.createElement('response');
                    if (node.response !== null) {
                        child.setAttribute('name', node.response.name);
                        child.textContent = node.response.text;
                    }
                    surveyresult.appendChild(child);
                    break;
                case "checkbox":
                    if (node.response == undefined) {
                        surveyresult.appendChild(this.parent.document.createElement('response'));
                        break;
                    }
                    for (var i = 0; i < node.response.length; i++) {
                        var checkNode = this.parent.document.createElement('response');
                        checkNode.setAttribute('name', node.response[i].name);
                        checkNode.setAttribute('checked', node.response[i].checked);
                        surveyresult.appendChild(checkNode);
                    }
                    break;
            }
        };
        this.complete = function () {
            this.state = "complete";
            this.XMLDOM.setAttribute("state", this.state);
        }
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
        if (specification.preTest != undefined) {
            this.preTest = new this.parent.surveyNode(this.parent, this.XMLDOM, this.specification.preTest);
        }
        if (specification.postTest != undefined) {
            this.postTest = new this.parent.surveyNode(this.parent, this.XMLDOM, this.specification.postTest);
        }

        // Add any page metrics
        var page_metric = this.parent.document.createElement('metric');
        this.XMLDOM.appendChild(page_metric);

        // Add the audioelement
        for (var element of this.specification.audioElements) {
            var aeNode = this.parent.document.createElement('audioelement');
            aeNode.setAttribute('ref', element.id);
            if (element.name != undefined) {
                aeNode.setAttribute('name', element.name)
            };
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
        }

        this.parent.root.appendChild(this.XMLDOM);

        this.complete = function () {
            this.state = "complete";
            this.XMLDOM.setAttribute("state", "complete");
        }
    };
    this.update = function () {
        this.SessionKey.update();
    }
    this.finish = function () {
        if (this.state == 0) {
            this.update();
        }
        this.state = 1;
        this.root.setAttribute("state", "complete");
        return this.root;
    };
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

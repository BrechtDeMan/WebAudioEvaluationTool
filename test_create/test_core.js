/* globals angular, window, Promise, XMLHttpRequest, Specification */
function get(url) {
    // Return a new promise.
    return new Promise(function (resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('GET', url);

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

        // Make the request
        req.send();
    });
}

var AngularInterface = angular.module("creator", []);

var specification = new Specification();

window.onload = function () {
    // Get the test interface specifications

};

AngularInterface.controller("view", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.popupVisible = true;

    $s.showPopup = function () {
        $s.popupVisible = true;
    };
    $s.hidePopup = function () {
        $s.popupVisible = false;
    };
    $s.globalSchema = undefined;
    get("xml/test-schema.xsd").then(function (text) {
        specification.processSchema(text);
        $s.globalSchema = specification.getSchema();
    });
    $s.specification = specification;
}]);

AngularInterface.controller("introduction", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.state = 0;
    $s.next = function () {
        $s.state++;
        if ($s.state > 1) {
            $s.hidePopup();
        }
    };
    $s.back = function () {
        $s.state--;
    };
    $s.mouseover = function (name) {
        var obj = $s.interfaces.find(function (i) {
            return i.name == name;
        });
        if (obj) {
            $s.description = obj.description.en;
        }
    };
    $s.initialise = function (name) {
        var obj = $s.interfaces.find(function (i) {
            return i.name == name;
        });
        specification.interface = obj.interface;
    };
    // Get the test interface specifications
    $s.interfaces = {};
    $s.description = "";
    var interfaceCollection = new Promise(function (resolve, reject) {
        var xml = new XMLHttpRequest();
        xml.open("GET", "test_create/interfaces/specifications.json");
        xml.onload = function () {
            if (xml.status === 200) {
                resolve(xml.responseText);
                return;
            }
            reject(xml.status);
        };
        xml.onerror = function () {
            reject(new Error("Network Error"));
        };
        xml.send();
    }).then(JSON.parse).then(function (data) {
        $s.interfaces = data.interfaces;
        $s.$apply();
    });
}]);

AngularInterface.controller("setup", ['$scope', '$element', '$window', function ($s, $e, $w) {
    function initialise() {
        if ($s.globalSchema) {
            $s.schema = $s.globalSchema.querySelector("[name=setup]");
        }
    }
    $s.schema = undefined;
    $s.attributes = [];
    $s.model = specification;

    $s.$watch("globalSchema", initialise);
}]);

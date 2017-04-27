/* globals document, angular, window, Promise, XMLHttpRequest, Specification */
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

    $s.addPage = function () {
        $s.specification.createNewPage();
    };

    $s.exportXML = function () {
        var s = new XMLSerializer();
        var doc = specification.encode();
        var bb = new Blob([s.serializeToString(doc)], {
            type: 'application/xml'
        });
        var dnlk = window.URL.createObjectURL(bb);
        window.location.href = dnlk;
    }
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

    $s.$watch("globalSchema", initialise);
    $s.$watch("specification.metrics.enabled.length", function () {
        var metricsNode = document.getElementById("metricsNode");
        if (!$s.specification.metrics) {
            return;
        }
        metricsNode.querySelectorAll("input").forEach(function (DOM) {
            DOM.checked = false;
        });
        $s.specification.metrics.enabled.forEach(function (metric) {
            var DOM = metricsNode.querySelector("[value=" + metric + "]");
            if (DOM) {
                DOM.checked = true;
            }
        });
    });

    $s.enableMetric = function ($event) {
        var metric = $event.currentTarget.value;
        var index = specification.metrics.enabled.findIndex(function (a) {
            return a == metric;
        });
        if ($event.currentTarget.checked) {
            if (index == -1) {
                specification.metrics.enabled.push(metric);
            }
        } else {
            if (index >= 0) {
                specification.metrics.enabled.splice(index, 1);
            }
        }
    };
}]);

AngularInterface.controller("survey", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.addSurveyEntry = function () {
        $s.survey.addOption();
    };
    $s.removeSurveyEntry = function (entry) {
        var index = $s.survey.options.findIndex(function (a) {
            return a == entry;
        });
        if (index === -1) {
            throw ("Invalid Entry");
        }
        $s.survey.options.splice(index, 1);
    };
}]);

AngularInterface.controller("surveyOption", ['$scope', '$element', '$window', function ($s, $e, $w) {

    $s.removeOption = function (option) {
        var index = $s.opt.options.findIndex(function (a) {
            return a == option;
        });
        if (index === -1) {
            throw ("Invalid option");
        }
        $s.opt.options.splice(index, 1);
    };
    $s.addOption = function () {
        $s.opt.options.push({
            name: "",
            text: ""
        });
    };

    $s.addCondition = function () {
        $s.opt.conditions.push({
            check: "equals",
            value: "",
            jumpToOnPass: undefined,
            jumpToOnFail: undefined
        });
    };

    $s.removeCondition = function (condition) {
        var index = $s.opt.conditions.findIndex(function (c) {
            return c == condition;
        });
        if (index === -1) {
            throw ("Invalid Condition");
        }
        $s.opt.conditions.splice(index, 1);
    };
}]);

AngularInterface.controller("interfaceNode", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.$watch("interface.options.length", function () {
        if (!$s.interface || !$s.interface.options) {
            return;
        }
        var options = $e[0].querySelector(".interfaceOptions").querySelectorAll(".attribute");
        options.forEach(function (option) {
            var name = option.getAttribute("name");
            var index = $s.interface.options.findIndex(function (io) {
                return io.name == name;
            });
            option.querySelector("input").checked = (index >= 0);
            if (name == "scalerange" && index >= 0) {
                option.querySelector("[name=min]").value = $s.interface.options[index].min;
                option.querySelector("[name=max]").value = $s.interface.options[index].max;
            }
        });
    });
    $s.enableInterfaceOption = function ($event) {
        var name = $event.currentTarget.parentElement.getAttribute("name");
        var type = $event.currentTarget.parentElement.getAttribute("type");
        var index = $s.interface.options.findIndex(function (io) {
            return io.name == name;
        });
        if (index == -1 && $event.currentTarget.checked) {
            var obj = $s.interface.options.push({
                name: name,
                type: type
            });
            if (name == "scalerange") {
                obj.min = $event.currentTarget.parentElement.querySelector("[name=min]").value;
                obj.max = $event.currentTarget.parentElement.querySelector("[name=max]").value;
            }
        } else if (index >= 0 && !$event.currentTarget.checked) {
            $s.interface.options.splice(index, 1);
        }
    };
    $s.removeScale = function (scale) {
        var index = $s.interface.scales.findIndex(function (s) {
            return s == scale;
        });
        if (index >= 0) {
            $s.interface.scales.splice(index, 1);
        }
    };
    $s.addScale = function () {
        $s.interface.scales.push({
            position: undefined,
            text: undefined
        });
    };
}]);
AngularInterface.controller("page", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.addInterface = function () {
        $s.page.addInterface();
    };
    $s.removeInterface = function (node) {
        var index = $s.page.interfaces.findIndex(function (a) {
            return a == node;
        });
        if (index === -1) {
            throw ("Invalid node");
        }
        $s.page.interfaces.splice(index, 1);
    };

    $s.addCommentQuestion = function () {
        $s.page.addCommentQuestion();
    };
    $s.removeCommentQuestion = function (node) {
        var index = $s.page.commentQuestions.findIndex(function (a) {
            return a == node;
        });
        if (index === -1) {
            throw ("Invalid node");
        }
        $s.page.commentQuestions.splice(index, 1);
    };
    $s.addAudioElement = function () {
        $s.page.addAudioElement();
    };
    $s.removeAudioElement = function (element) {
        var index = $s.page.audioElements.findIndex(function (a) {
            return a == element;
        });
        if (index === -1) {
            throw ("Invalid node");
        }
        $s.page.audioElements.splice(index, 1);
    };
}]);

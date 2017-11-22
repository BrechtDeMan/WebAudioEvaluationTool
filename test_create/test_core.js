/* globals document, angular, window, Promise, XMLHttpRequest, Specification, XMLSerializer, Blob, DOMParser, FileReader, $*/
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
    toggleDropdowns();
};

function toggleDropdowns() {
    $(function () {
        $('[data-toggle="popover"]').popover();
    });
}

function handleFiles(event) {
    var s = angular.element(event.currentTarget).scope();
    s.handleFiles(event);
    s.$apply();
}

AngularInterface.controller("view", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.popupVisible = true;
    $s.testSpecifications = {};

    (function () {
        new Promise(function (resolve, reject) {
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
            $s.testSpecifications = data;
            $s.$apply();
        });
    })();

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
    $s.availableInterfaceModules = [];
    get("interfaces/interfaces.json").then(JSON.parse).then(function (d) {
        $s.availableInterfaceModules = d.interfaces;
        $s.$apply();
    });
    $s.specification = specification;
    $s.selectedTestPrototype = undefined;
    $s.setTestPrototype = function (obj) {
        $s.selectedTestPrototype = obj;
        $w.specification.interface = obj.interface;
    }

    $s.addPage = function () {
        $s.specification.createNewPage();
    };

    $s.removePage = function (page) {
        var index = $s.specification.pages.findIndex(function (a) {
            return a == page;
        });
        if (index === -1) {
            throw ("Invalid Page");
        }
        $s.specification.pages.splice(index, 1);
    };

    $s.exportXML = function () {
        var s = new XMLSerializer();
        var doc = "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>" + specification.encode();
        var xmlstr = s.serializeToString(doc);
        var bb = new Blob([s.serializeToString(doc)], {
            type: 'application/xml'
        });
        var dnlk = window.URL.createObjectURL(bb);
        var a = document.createElement("a");
        document.body.appendChild(a)
        a.href = dnlk;
        a.download = "test.xml";
        a.click();
        window.URL.revokeObjectURL(dnlk);
        document.body.removeChild(a);
    };
    $s.validated = false;
    $s.showValidationMessages = false;
    $s.validate = function () {
        var s = new XMLSerializer();
        var Module = {
            xml: "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>" + s.serializeToString(specification.encode()),
            schema: specification.getSchemaString(),
            arguments: ["--noout", "--schema", 'test-schema.xsd', 'document.xml']
        };
        var xmllint = validateXML(Module);
        console.log(xmllint);
        if (xmllint != 'document.xml validates\n') {
            $s.validated = false;
            var list = $e[0].querySelector("#validation-error-list");
            while (list.firstChild) {
                list.removeChild(list.firstChild);
            }
            var errors = xmllint.split('\n');
            errors = errors.slice(0, errors.length - 2);
            errors.forEach(function (str) {
                var li = document.createElement("li");
                li.textContent = str;
                list.appendChild(li);
            });
        } else {
            $s.validated = true;
        }
        $s.showValidationMessages = true;
    }
    $s.hideValidationMessages = function () {
        $s.showValidationMessages = false;
    }
    $s.$watch(function () {
        return document.querySelectorAll("div.pageNode").length;
    }, $w.toggleDropdowns);
    $s.$watch(function () {
        return document.querySelectorAll("div.surveyentry").length;
    }, $w.toggleDropdowns);
    $s.$watch(function () {
        return document.querySelectorAll("div.interface").length;
    }, $w.toggleDropdowns);
    $s.$watch(function () {
        return document.querySelectorAll("div.audioelement").length;
    }, $w.toggleDropdowns);
}]);

AngularInterface.controller("introduction", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.state = 0;
    $s.selected = undefined;
    $s.next = function () {
        $s.state++;
        if ($s.state > 1 || $s.file) {
            $s.hidePopup();
            $s.initialise($s.selected);
        }
    };
    $s.back = function () {
        $s.state--;
    };
    $s.mouseover = function (name) {
        var obj = $s.testSpecifications.interfaces.find(function (i) {
            return i.name == name;
        });
        if (obj) {
            $s.description = obj.description.en;
        }
    };
    $s.initialise = function (name) {
        var obj = $s.testSpecifications.interfaces.find(function (i) {
            return i.name == name;
        });
        if (obj === undefined) {
            throw ("Cannot find specification");
        }
        if (typeof obj.template === "string") {
            get(obj.template).then(function (data) {
                $s.parseFile(data);
            }, function (err) {})
        } else {
            $s.setTestPrototype(obj);
        }
    };
    $s.select = function (name) {
        $s.selected = name;
    }
    // Get the test interface specifications
    $s.file = undefined;
    $s.description = "";

    $s.parseFile = function (f) {
        var p = new DOMParser();
        specification.decode(p.parseFromString(f, "text/xml"));
        $s.$apply();
    }

    $s.handleFiles = function ($event) {
        $s.file = $event.currentTarget.files[0];
        var r = new FileReader();
        r.onload = function () {
            $s.parseFile(r.result);
        };
        r.readAsText($s.file);
    };
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

    $s.configure = function () {}

    $s.$watch("selectedTestPrototype", $s.configure);

    $s.placeholder = function (name) {
        if ($s.schema) {
            var spec = $s.schema.querySelector("attribute[name=\"" + name + "\"]") || $w.specification.schema.querySelector("attribute[name=\"" + name + "\"]");
            var attr = spec.getAttribute("default");
            if (attr === null) {
                return "Not set";
            }
            return attr;
        }
    }
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
    $s.scales = [];
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
    $s.clearScales = function () {
        $s.interface.scales = [];
    };
    $s.useScales = function (scale) {
        $s.clearScales();
        scale.scales.forEach(function (s) {
            $s.interface.scales.push(s);
        });
        $s.selectedScale = scale.name;
    };
    $s.selectedScale = undefined;

    $s.configure = function () {
        if ($s.selectedTestPrototype === undefined) {
            return;
        }
        if ($s.selectedTestPrototype.checks && $s.selectedTestPrototype.checks.length >= 1) {
            $s.selectedTestPrototype.checks.forEach(function (entry) {
                var dom = $e[0].querySelector("[name=\"" + entry.name + "\"] input");
                if (entry.support == "none") {
                    dom.checked = false;
                    dom.disabled = true;
                }
            });
        }
        if ($s.selectedTestPrototype.show && $s.selectedTestPrototype.show.length >= 1) {
            $s.selectedTestPrototype.show.forEach(function (entry) {
                var dom = $e[0].querySelector("[name=\"" + entry.name + "\"] input");
                if (entry.support == "none") {
                    dom.checked = false;
                    dom.disabled = true;
                }
            });
        }
        if ($s.interface !== specification.interfaces) {
            // Page specific interface nodes
            if ($s.selectedTestPrototype.hasScales !== undefined && ($s.selectedTestPrototype.hasScales == "false" || $s.selectedTestPrototype.hasScales == false)) {
                var elem = $e[0].querySelector("[name=\"scale-selection\"]")
                elem.style.visibility = "hidden";
                elem.style.height = "0px";
            }
            if ($s.selectedTestPrototype.scales && $s.selectedTestPrototype.show.length >= 1) {
                $s.scales = [];
                $s.selectedTestPrototype.scales.forEach(function (scalename) {
                    var obj = $s.testSpecifications.scales.find(function (a) {
                        return a.name == scalename;
                    });
                    $s.scales.push(obj);
                });
                if ($s.selectedTestPrototype.scales.includes($s.selectedScale) == false) {
                    $s.clearScales();
                }
                if ($s.scales.length == 1) {
                    $s.clearScales();
                    $s.useScales($s.scales[0]);
                }
            } else {
                $s.scales = $s.testSpecifications.scales;
            }
        }
    };

    $s.$watch("selectedTestPrototype", $s.configure);
    $s.configure();
}]);
AngularInterface.controller("page", ['$scope', '$element', '$window', function ($s, $e, $w) {
    $s.schema = $w.specification.schema.querySelector("element[name=\"page\"]");
    $s.page.label = $s.page.label || "default";
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

    $s.placeholder = function (name) {
        var spec = $s.schema.querySelector("attribute[name=\"" + name + "\"]") || $w.specification.schema.querySelector("attribute[name=\"" + name + "\"]");
        var attr = spec.getAttribute("default");
        if (attr === null) {
            return "Not set";
        }
        return attr;
    }
}]);

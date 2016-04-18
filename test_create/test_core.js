var interfaceSpecs;
var xmlHttp;
var popupObject;
var popupStateNodes;
var specification;
var convert;
var attributeText;

// Firefox does not have an XMLDocument.prototype.getElementsByName
// and there is no searchAll style command, this custom function will
// search all children recusrively for the name. Used for XSD where all
// element nodes must have a name and therefore can pull the schema node
XMLDocument.prototype.getAllElementsByName = function(name)
{
    name = String(name);
    var selected = this.documentElement.getAllElementsByName(name);
    return selected;
}

Element.prototype.getAllElementsByName = function(name)
{
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while(node != null)
    {
        if (node.getAttribute('name') == name)
        {
            selected.push(node);
        }
        if (node.childElementCount > 0)
        {
            selected = selected.concat(node.getAllElementsByName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
}

XMLDocument.prototype.getAllElementsByTagName = function(name)
{
    name = String(name);
    var selected = this.documentElement.getAllElementsByTagName(name);
    return selected;
}

Element.prototype.getAllElementsByTagName = function(name)
{
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while(node != null)
    {
        if (node.nodeName == name)
        {
            selected.push(node);
        }
        if (node.childElementCount > 0)
        {
            selected = selected.concat(node.getAllElementsByTagName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
}

// Firefox does not have an XMLDocument.prototype.getElementsByName
if (typeof XMLDocument.prototype.getElementsByName != "function") {
    XMLDocument.prototype.getElementsByName = function(name)
    {
        name = String(name);
        var node = this.documentElement.firstElementChild;
        var selected = [];
        while(node != null)
        {
            if (node.getAttribute('name') == name)
            {
                selected.push(node);
            }
            node = node.nextElementSibling;
        }
        return selected;
    }
}

window.onload = function()
{
    specification = new Specification();
    convert = new SpecificationToHTML();
    xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET","test_create/interface-specs.xml",true);
    xmlHttp.onload = function()
    {
        var parse = new DOMParser();
        interfaceSpecs = parse.parseFromString(xmlHttp.response,'text/xml');
        buildPage();
        popupObject.postNode(popupStateNodes.state[0])
    }
    xmlHttp.send();
    
    var xsdGet = new XMLHttpRequest();
    xsdGet.open("GET","xml/test-schema.xsd",true);
    xsdGet.onload = function()
    {
        var parse = new DOMParser();
        specification.schema = parse.parseFromString(xsdGet.response,'text/xml');;
    }
    xsdGet.send();
    
    var jsonAttribute = new XMLHttpRequest();
    jsonAttribute.open("GET","test_create/attributes.json",true);
    jsonAttribute.onload = function()
    {
        attributeText = JSON.parse(jsonAttribute.response)
    }
    jsonAttribute.send();
}

function buildPage()
{
    popupObject = new function() {
        this.object = document.getElementById("popupHolder");
        this.blanket = document.getElementById("blanket");

        this.popupTitle = document.createElement("div");
        this.popupTitle.id = "popup-title-holder";
        this.popupTitle.align = "center";
        this.titleDOM = document.createElement("span");
        this.titleDOM.id = "popup-title";
        this.popupTitle.appendChild(this.titleDOM);
        this.object.appendChild(this.popupTitle);

        this.popupContent = document.createElement("div");
        this.popupContent.id = "popup-content";
        this.object.appendChild(this.popupContent);
        
        this.proceedButton = document.createElement("button");
        this.proceedButton.id = "popup-proceed";
        this.proceedButton.className = "popup-button";
        this.proceedButton.textContent = "Next";
        this.proceedButton.onclick = function()
        {
            popupObject.popupContent.innerHTML = null;
            if(typeof popupObject.shownObject.continue == "function") {
                popupObject.shownObject.continue();
            } else {
                popupObject.hide();
            }
        };
        this.object.appendChild(this.proceedButton);
        
        this.backButton = document.createElement("button");
        this.backButton.id = "popup-back";
        this.backButton.className = "popup-button";
        this.backButton.textContent = "Back";
        this.backButton.onclick = function()
        {
            popupObject.popupContent.innerHTML = null;
            popupObject.shownObject.back();
        };
        this.object.appendChild(this.backButton);
        
        this.shownObject;

        this.resize = function()
        {
            var w = window.innerWidth;
            var h = window.innerHeight;
            this.object.style.left = Math.floor((w-750)/2) + 'px';
            this.object.style.top = Math.floor((h-500)/2) + 'px';
        }

        this.show = function()
        {
            this.object.style.visibility = "visible";
            this.blanket.style.visibility = "visible";
            if (typeof this.shownObject.back == "function") {
                this.backButton.style.visibility = "visible";
            } else {
                this.backButton.style.visibility = "hidden";
            }
        }

        this.hide = function()
        {
            this.object.style.visibility = "hidden";
            this.blanket.style.visibility = "hidden";
            this.backButton.style.visibility = "hidden";
        }

        this.postNode = function(postObject)
        {
            //Passed object must have the following:
            // Title: text to show in the title
            // Content: HTML DOM to show on the page
            // On complete this HTML DOM is destroyed so make sure it is referenced elsewhere for processing
            this.titleDOM.textContent = postObject.title;
            this.popupContent.appendChild(postObject.content);
            this.shownObject = postObject;
            if (typeof this.shownObject.back == "function") {
                this.backButton.style.visibility = "visible";
            } else {
                this.backButton.style.visibility = "hidden";
            }
            if (typeof this.shownObject.continue == "function") {
                this.proceedButton.textContent = "Next";
            } else {
                this.proceedButton.textContent = "Finish";
            }
            this.show();
        }

        this.resize();
        this.hide();
    };
    
    popupStateNodes = new function()
    {
        // This defines the several popup states wanted
        this.state = [];
        this.state[0] = new function()
        {
            this.title = "Welcome";
            this.content = document.createElement("div");
            this.content.id = "state-0";
            var span = document.createElement("span");
            span.textContent = "Welcome to the WAET test creator tool. This will allow you to create a new test from scratch to suit your testing needs. If you wish to update a test file, please drag and drop the XML document into the area below for processing, otherwise press 'Next' to start a new test. This tool generates files for the WAET 1.2.0 version."
            this.content.appendChild(span);
            this.dragArea = document.createElement("div");
            this.dragArea.className = "drag-area";
            this.dragArea.id = "project-drop";
            this.content.appendChild(this.dragArea);
            
            this.dragArea.addEventListener('dragover',function(e){
                e.stopPropagation();
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                e.currentTarget.className = "drag-area drag-over";
            });
            
            this.dragArea.addEventListener('dragexit',function(e){
                e.stopPropagation();
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                e.currentTarget.className = "drag-area";
            });
            
            this.dragArea.addEventListener('drop',function(e){
                e.stopPropagation();
                e.preventDefault();
                e.currentTarget.className = "drag-area drag-dropped";
                var files = e.dataTransfer.files[0];
                var reader = new FileReader();
                reader.onload = function(decoded) {
                    var parse = new DOMParser();
                    specification.decode(parse.parseFromString(decoded.target.result,'text/xml'));
                    popupObject.hide();
                    popupObject.popupContent.innerHTML = null;
                    convert.convert(document.getElementById('content'));
                }
                reader.readAsText(files);
            });
            

            this.continue = function()
            {
                popupObject.postNode(popupStateNodes.state[1]);
            }
        }
        this.state[1] = new function()
        {
            this.title = "Select your interface";
            this.content = document.createElement("div");
            this.content.id = "state-1";
            var spnH = document.createElement('div');
            var span = document.createElement("span");
            span.textContent = "Please select your interface from the list shown below. This will define the various options which are available. This can later be changed.";
            spnH.appendChild(span);
            this.content.appendChild(spnH);
            this.select = document.createElement("select");
            this.testsXML = interfaceSpecs.getElementsByTagName('tests')[0].children;
            for (var i=0; i<this.testsXML.length; i++)
            {
                var option = document.createElement('option');
                option.value = this.testsXML[i].getAttribute('name');
                option.textContent = this.testsXML[i].getAttribute('name');
                this.select.appendChild(option);
            }
            this.content.appendChild(this.select);
            this.continue = function()
            {
                var testXML = interfaceSpecs.getElementsByTagName("tests")[0].getAllElementsByName(this.select.value)[0];
                specification.interface = testXML.getAttribute("interface");
                if (specification.interfaces == null)
                {
                    specification.interfaces = new specification.interfaceNode(specification);
                }
                if (specification.metrics == null)  {
                    specification.metrics = new specification.metricNode();
                }
                popupStateNodes.state[2].generate();
                popupObject.postNode(popupStateNodes.state[2]);
            }
            this.back = function() {
                popupObject.postNode(popupStateNodes.state[0]);
            }
        }
        this.state[2] = new function()
        {
            this.title = "Test Checks & Restrictions";
            this.content = document.createElement("div");
            this.content.id = "state-1";
            var spnH = document.createElement('div');
            var span = document.createElement("span");
            span.textContent = "Select your test checks and restrictions. Greyed out items are fixed by the test/interface and cannot be changed";
            spnH.appendChild(span);
            this.content.appendChild(spnH);
            var holder = document.createElement("div");
            this.options = [];
            this.testXML = null;
            this.interfaceXML = null;
            this.dynamicContent = document.createElement("div");
            this.content.appendChild(this.dynamicContent);
            this.generate = function()
            {
                this.options = [];
                this.dynamicContent.innerHTML = null;
                var interfaceName = popupStateNodes.state[1].select.value;
                this.checkText = interfaceSpecs.getElementsByTagName("global")[0].getAllElementsByTagName("checks")[0];
                this.testXML = interfaceSpecs.getElementsByTagName("tests")[0].getAllElementsByName(interfaceName)[0];
                this.interfaceXML = interfaceSpecs.getAllElementsByTagName("interfaces")[0].getAllElementsByName(this.testXML.getAttribute("interface"))[0].getAllElementsByTagName("checks")[0];
                this.testXML = this.testXML.getAllElementsByTagName("checks");
                for (var i=0; i<this.interfaceXML.children.length; i++)
                {
                    var interfaceNode = this.interfaceXML.children[i];
                    var checkName = interfaceNode.getAttribute('name');
                    var testNode
                    if (this.testXML.length > 0)
                    {
                        testNode = this.testXML[0].getAllElementsByName(checkName);
                        if(testNode.length != 0) {testNode = testNode[0];}
                        else {testNode = undefined;}
                    } else {
                        testNode = undefined;
                    }
                    var obj = {
                        root: document.createElement("div"),
                        text: document.createElement("label"),
                        input: document.createElement("input"),
                        parent: this,
                        name: checkName,
                        handleEvent: function(event) {
                            if (this.input.checked) {
                                // Add to specification.interfaces.option
                                var included = specification.interfaces.options.find(function(element,index,array){
                                    if (element.name == this.name) {return true;} else {return false;}
                                },this);
                                if (included == null) {
                                    specification.interfaces.options.push({type:"check",name:this.name});
                                }
                            } else {
                                // Remove from specification.interfaces.option
                                var position = specification.interfaces.options.findIndex(function(element,index,array){
                                    if (element.name == this.name) {return true;} else {return false;}
                                },this);
                                if (position >= 0) {
                                    specification.interfaces.options.splice(position,1);
                                }
                            }
                        }
                    }
                    
                    obj.input.addEventListener("click",obj);
                    obj.root.className = "popup-checkbox";
                    obj.input.type = "checkbox";
                    obj.input.setAttribute('id',checkName);
                    obj.text.setAttribute("for",checkName);
                    obj.text.textContent = this.checkText.getAllElementsByName(checkName)[0].textContent;
                    obj.root.appendChild(obj.input);
                    obj.root.appendChild(obj.text);
                    if(testNode != undefined)
                    {
                        if (testNode.getAttribute('default') == 'on')
                        {
                            obj.input.checked = true;
                        }
                        if (testNode.getAttribute('support') == "none")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = false;
                            obj.root.className = "popup-checkbox disabled";
                        }else if (interfaceNode.getAttribute('support') == "mandatory")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = true;
                            obj.root.className = "popup-checkbox disabled";
                        }
                    } else {
                        if (interfaceNode.getAttribute('default') == 'on')
                        {
                            obj.input.checked = true;
                        }
                        if (interfaceNode.getAttribute('support') == "none")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = false;
                            obj.root.className = "popup-checkbox disabled";
                        } else if (interfaceNode.getAttribute('support') == "mandatory")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = true;
                            obj.root.className = "popup-checkbox disabled";
                        }
                    }
                    var included = specification.interfaces.options.find(function(element,index,array){
                        if (element.name == this.name) {return true;} else {return false;}
                    },obj);
                    if (included != undefined) {
                        obj.input.checked = true;
                    }
                    obj.handleEvent();
                    this.options.push(obj);
                    this.dynamicContent.appendChild(obj.root);
                }
            }
            this.continue = function()
            {
                popupStateNodes.state[3].generate();
                popupObject.postNode(popupStateNodes.state[3]);
            }
            this.back = function() {
                popupObject.postNode(popupStateNodes.state[1]);
            }
        }
        this.state[3] = new function()
        {
            this.title = "Test Metrics";
            this.content = document.createElement("div");
            this.content.id = "state-1";
            var spnH = document.createElement('div');
            var span = document.createElement("span");
            span.textContent = "Select which data points to include in the exported results XML. Some of this is required for certain post script analysis. See the documentation for further details";
            spnH.appendChild(span);
            this.content.appendChild(spnH);
            this.options = [];
            this.checkText;
            this.testXML;
            this.interfaceXML;
            this.dynamicContent = document.createElement("div");
            this.content.appendChild(this.dynamicContent);
            this.generate = function()
            {
                this.options = [];
                this.dynamicContent.innerHTML = null;
                var interfaceName = popupStateNodes.state[1].select.value;
                this.checkText = interfaceSpecs.getElementsByTagName("global")[0].getAllElementsByTagName("metrics")[0];
                this.testXML = interfaceSpecs.getElementsByTagName("tests")[0].getAllElementsByName(interfaceName)[0];
                this.interfaceXML = interfaceSpecs.getAllElementsByTagName("interfaces")[0].getAllElementsByName(this.testXML.getAttribute("interface"))[0].getAllElementsByTagName("metrics")[0];
                this.testXML = this.testXML.getAllElementsByTagName("metrics");
                for (var i=0; i<this.interfaceXML.children.length; i++)
                {
                    var interfaceNode = this.interfaceXML.children[i];
                    var checkName = interfaceNode.getAttribute('name');
                    var testNode
                    if (this.testXML.length > 0)
                    {
                        testNode = this.testXML[0].getAllElementsByName(checkName);
                        if(testNode.length != 0) {testNode = testNode[0];}
                        else {testNode = undefined;}
                    } else {
                        testNode = undefined;
                    }
                    var obj = {
                        root: document.createElement("div"),
                        text: document.createElement("label"),
                        input: document.createElement("input"),
                        parent: this,
                        name: checkName,
                        handleEvent: function(event) {
                            if (this.input.checked) {
                                // Add to specification.interfaces.option
                                var included = specification.metrics.enabled.find(function(element,index,array){
                                    if (element == this.name) {return true;} else {return false;}
                                },this);
                                if (included == null) {
                                    specification.metrics.enabled.push(this.name);
                                }
                            } else {
                                // Remove from specification.interfaces.option
                                var position = specification.metrics.enabled.findIndex(function(element,index,array){
                                    if (element == this.name) {return true;} else {return false;}
                                },this);
                                if (position >= 0) {
                                    specification.metrics.enabled.splice(position,1);
                                }
                            }
                        }
                    }
                    
                    obj.input.addEventListener("click",obj);
                    obj.root.className = "popup-checkbox";
                    obj.input.type = "checkbox";
                    obj.input.setAttribute('id',checkName);
                    obj.text.setAttribute("for",checkName);
                    obj.text.textContent = this.checkText.getAllElementsByName(checkName)[0].textContent;
                    obj.root.appendChild(obj.input);
                    obj.root.appendChild(obj.text);
                    if(testNode != undefined)
                    {
                        if (testNode.getAttribute('default') == 'on')
                        {
                            obj.input.checked = true;
                        }
                        if (testNode.getAttribute('support') == "none")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = false;
                            obj.root.className = "popup-checkbox disabled";
                        }else if (interfaceNode.getAttribute('support') == "mandatory")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = true;
                            obj.root.className = "popup-checkbox disabled";
                        }
                    } else {
                        if (interfaceNode.getAttribute('default') == 'on')
                        {
                            obj.input.checked = true;
                        }
                        if (interfaceNode.getAttribute('support') == "none")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = false;
                            obj.root.className = "popup-checkbox disabled";
                        } else if (interfaceNode.getAttribute('support') == "mandatory")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = true;
                            obj.root.className = "popup-checkbox disabled";
                        }
                    }
                    var included = specification.metrics.enabled.find(function(element,index,array){
                        if (element == this.name) {return true;} else {return false;}
                    },obj);
                    obj.handleEvent();
                    if (included != undefined) {
                        obj.input.checked = true;
                    }
                    this.options.push(obj);
                    this.dynamicContent.appendChild(obj.root);
                }
            }
            this.continue = function()
            {
                popupStateNodes.state[4].generate();
                popupObject.postNode(popupStateNodes.state[4]);
            }
            this.back = function() {
                popupObject.postNode(popupStateNodes.state[2]);
            }
        }
        this.state[4] = new function()
        {
            this.title = "Test Visuals";
            this.content = document.createElement("div");
            this.content.id = "state-1";
            var spnH = document.createElement('div');
            var span = document.createElement("span");
            span.textContent = "You can display extra visual content with your interface for the test user to interact with. Select from the available options below. Greyed out options are unavailable for your selected interface";
            spnH.appendChild(span);
            this.content.appendChild(spnH);
            this.options = [];
            this.checkText;
            this.testXML;
            this.interfaceXML;
            this.dynamicContent = document.createElement("div");
            this.content.appendChild(this.dynamicContent);
            this.generate = function()
            {
                this.options = [];
                this.dynamicContent.innerHTML = null;
                var interfaceName = popupStateNodes.state[1].select.value;
                this.checkText = interfaceSpecs.getElementsByTagName("global")[0].getAllElementsByTagName("show")[0];
                this.testXML = interfaceSpecs.getElementsByTagName("tests")[0].getAllElementsByName(interfaceName)[0];
                this.interfaceXML = interfaceSpecs.getAllElementsByTagName("interfaces")[0].getAllElementsByName(this.testXML.getAttribute("interface"))[0].getAllElementsByTagName("show")[0];
                this.testXML = this.testXML.getAllElementsByTagName("show");
                for (var i=0; i<this.interfaceXML.children.length; i++)
                {
                    var interfaceNode = this.interfaceXML.children[i];
                    var checkName = interfaceNode.getAttribute('name');
                    var testNode
                    if (this.testXML.length > 0)
                    {
                        testNode = this.testXML[0].getAllElementsByName(checkName);
                        if(testNode.length != 0) {testNode = testNode[0];}
                        else {testNode = undefined;}
                    } else {
                        testNode = undefined;
                    }
                    var obj = {
                        root: document.createElement("div"),
                        text: document.createElement("label"),
                        input: document.createElement("input"),
                        parent: this,
                        name: checkName,
                        handleEvent: function(event) {
                            if (this.input.checked) {
                                // Add to specification.interfaces.option
                                var included = specification.interfaces.options.find(function(element,index,array){
                                    if (element.name == this.name) {return true;} else {return false;}
                                },this);
                                if (included == null) {
                                    specification.interfaces.options.push({type:"show",name:this.name});
                                }
                            } else {
                                // Remove from specification.interfaces.option
                                var position = specification.interfaces.options.findIndex(function(element,index,array){
                                    if (element.name == this.name) {return true;} else {return false;}
                                },this);
                                if (position >= 0) {
                                    specification.interfaces.options.splice(position,1);
                                }
                            }
                        }
                    }
                    
                    obj.input.addEventListener("click",obj);
                    obj.root.className = "popup-checkbox";
                    obj.input.type = "checkbox";
                    obj.input.setAttribute('id',checkName);
                    obj.text.setAttribute("for",checkName);
                    obj.text.textContent = this.checkText.getAllElementsByName(checkName)[0].textContent;
                    obj.root.appendChild(obj.input);
                    obj.root.appendChild(obj.text);
                    if(testNode != undefined)
                    {
                        if (testNode.getAttribute('default') == 'on')
                        {
                            obj.input.checked = true;
                        }
                        if (testNode.getAttribute('support') == "none")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = false;
                            obj.root.className = "popup-checkbox disabled";
                        }else if (interfaceNode.getAttribute('support') == "mandatory")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = true;
                            obj.root.className = "popup-checkbox disabled";
                        }
                    } else {
                        if (interfaceNode.getAttribute('default') == 'on')
                        {
                            obj.input.checked = true;
                        }
                        if (interfaceNode.getAttribute('support') == "none")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = false;
                            obj.root.className = "popup-checkbox disabled";
                        } else if (interfaceNode.getAttribute('support') == "mandatory")
                        {
                            obj.input.disabled = true;
                            obj.input.checked = true;
                            obj.root.className = "popup-checkbox disabled";
                        }
                    }
                    var included = specification.interfaces.options.find(function(element,index,array){
                        if (element.name == this.name) {return true;} else {return false;}
                    },obj);
                    if (included != undefined) {
                        obj.input.checked = true;
                    }
                    obj.handleEvent();
                    this.options.push(obj);
                    this.dynamicContent.appendChild(obj.root);
                }
            }
            this.continue = function()
            {
                popupObject.hide();
                convert.convert(document.getElementById('content'));
            }
            this.back = function() {
                popupObject.postNode(popupStateNodes.state[3]);
            }
        }
        this.state[5] = new function() {
            this.title = "Add/Edit Survey Element";
            this.content = document.createElement("div");
            this.content.id = "state-1";
            var spnH = document.createElement('div');
            var span = document.createElement("span");
            span.textContent = "You can configure your survey element here. Press 'Continue' to complete your changes.";
            spnH.appendChild(span);
            this.content.appendChild(spnH);
            this.dynamic = document.createElement("div");
            this.option = null;
            this.parent = null;
            this.optionLists = [];
            this.select = document.createElement("select");
            this.select.setAttribute("name","type");
            this.select.addEventListener("change",this,false);
            this.content.appendChild(this.select);
            this.content.appendChild(this.dynamic);
            this.generate = function(option, parent)
            {
                this.option = option;
                this.parent = parent;
                if (this.select.childElementCount == 0) {
                    var optionList = specification.schema.getAllElementsByName("survey")[0].getAllElementsByName("type")[0].getAllElementsByTagName("xs:enumeration");
                    for (var i=0; i<optionList.length; i++)
                    {
                        var selectOption = document.createElement("option");
                        selectOption.value = optionList[i].getAttribute("value");
                        selectOption.textContent = selectOption.value;
                        this.select.appendChild(selectOption);
                    }
                }
                if (this.option.type != undefined){
                    this.select.value = this.option.type
                } else {
                    this.select.value = "statement";
                    this.option.type = "statement";
                }
                
                this.dynamic.innerHTML = null;
                var statement = document.createElement("div");
                var statementText = document.createElement("span");
                var statementEntry = document.createElement("input");
                statement.appendChild(statementText);
                statement.appendChild(statementEntry);
                statement.className = "survey-entry-attribute";
                statementText.textContent = "Statement/Question";
                statementEntry.style.width = "500px";
                statementEntry.addEventListener("change",this,false);
                statementEntry.setAttribute("name","statement");
                statementEntry.value = this.option.statement;
                this.dynamic.appendChild(statement);
                
                var id = document.createElement("div");
                var idText = document.createElement("span");
                var idEntry = document.createElement("input");
                id.appendChild(idText);
                id.appendChild(idEntry);
                id.className = "survey-entry-attribute";
                idText.textContent = "ID: ";
                idEntry.addEventListener("change",this,false);
                idEntry.setAttribute("name","id");
                idEntry.value = this.option.id;
                
                this.dynamic.appendChild(id);
                
                switch(this.option.type)
                {
                    case "statement":
                        break;
                    case "question":
                        var boxsizeSelect = document.createElement("select");
                        var optionList = specification.schema.getAllElementsByName("survey")[0].getAllElementsByName("boxsize")[0].getAllElementsByTagName("xs:enumeration");
                        for (var i=0; i<optionList.length; i++)
                        {
                            var selectOption = document.createElement("option");
                            selectOption.value = optionList[i].getAttribute("value");
                            selectOption.textContent = selectOption.value;
                            boxsizeSelect.appendChild(selectOption);
                        }
                        if(this.option.boxsize != undefined) {
                            boxsizeSelect.value = this.option.boxsize;
                        } else {
                            boxsizeSelect.value = "normal";
                            this.option.boxsize = "normal";
                        }
                        boxsizeSelect.setAttribute("name","boxsize");
                        boxsizeSelect.addEventListener("change",this,false);
                        var boxsize = document.createElement("div");
                        var boxsizeText = document.createElement("span");
                        boxsizeText.textContent = "Entry Size: ";
                        boxsize.appendChild(boxsizeText);
                        boxsize.appendChild(boxsizeSelect);
                        boxsize.className = "survey-entry-attribute";
                        this.dynamic.appendChild(boxsize);
                        
                        var mandatory = document.createElement("div");
                        var mandatoryInput = document.createElement("input");
                        var mandatoryText = document.createElement("span");
                        mandatoryText.textContent = "Mandatory: ";
                        mandatory.appendChild(mandatoryText);
                        mandatory.appendChild(mandatoryInput);
                        mandatory.className = "survey-entry-attribute";
                        mandatoryInput.type = "checkbox";
                        if (this.option.mandatory) {mandatoryInput.checked = true;} else {mandatoryInput.checked = false;}
                        mandatoryInput.setAttribute("name","mandatory");
                        mandatoryInput.addEventListener("change",this,false);
                        this.dynamic.appendChild(mandatory);
                        break;
                    case "number":
                        this.dynamic.appendChild(id);
                        
                        var mandatory = document.createElement("div");
                        var mandatoryInput = document.createElement("input");
                        var mandatoryText = document.createElement("span");
                        mandatoryText.textContent = "Mandatory: ";
                        mandatory.appendChild(mandatoryText);
                        mandatory.appendChild(mandatoryInput);
                        mandatory.className = "survey-entry-attribute";
                        mandatoryInput.type = "checkbox";
                        if (this.option.mandatory) {mandatoryInput.checked = true;} else {mandatoryInput.checked = false;}
                        mandatoryInput.setAttribute("name","mandatory");
                        mandatoryInput.addEventListener("change",this,false);
                        this.dynamic.appendChild(mandatory);
                        
                        var minimum = document.createElement("div");
                        var minimumEntry = document.createElement("input");
                        var minimumText = document.createElement("span");
                        minimumText.textContent = "Minimum: ";
                        minimum.appendChild(minimumText);
                        minimum.appendChild(minimumEntry);
                        minimum.className = "survey-entry-attribute";
                        minimumEntry.type = "number";
                        minimumEntry.setAttribute("name","min");
                        minimumEntry.addEventListener("change",this,false);
                        minimumEntry.value = this.option.min;
                        this.dynamic.appendChild(minimum);
                        
                        var maximum = document.createElement("div");
                        var maximumEntry = document.createElement("input");
                        var maximumText = document.createElement("span");
                        maximumText.textContent = "Maximum: ";
                        maximum.appendChild(maximumText);
                        maximum.appendChild(maximumEntry);
                        maximum.className = "survey-entry-attribute";
                        maximumEntry.type = "number";
                        maximumEntry.setAttribute("name","max");
                        maximumEntry.addEventListener("change",this,false);
                        maximumEntry.value = this.option.max;
                        this.dynamic.appendChild(maximum);
                        break;
                    case "checkbox":
                    case "radio":
                        this.dynamic.appendChild(id);
                        var optionHolder = document.createElement("div");
                        optionHolder.className = 'node';
                        optionHolder.id = 'popup-option-holder';
                        var optionObject = function(parent,option) {
                            this.rootDOM = document.createElement("div");
                            this.rootDOM.className = "popup-option-entry";
                            this.inputName = document.createElement("input");
                            this.inputName.setAttribute("name","name");
                            this.inputLabel = document.createElement("input");
                            this.inputLabel.setAttribute("name","text");
                            this.specification = option;
                            this.parent = parent;
                            this.handleEvent = function()
                            {
                                var target = event.currentTarget.getAttribute("name");
                                eval("this.specification."+target+" = event.currentTarget.value");
                            };
                            
                            var nameText = document.createElement("span");
                            nameText.textContent = "Name: ";
                            var labelText = document.createElement("span");
                            labelText.textContent = "Label: ";
                            this.rootDOM.appendChild(nameText);
                            this.rootDOM.appendChild(this.inputName);
                            this.rootDOM.appendChild(labelText);
                            this.rootDOM.appendChild(this.inputLabel);
                            this.inputName.addEventListener("change",this,false);
                            this.inputLabel.addEventListener("change",this,false);
                            this.inputName.value = this.specification.name;
                            this.inputLabel.value = this.specification.text;
                            this.inputLabel.style.width = "350px";
                            
                            this.deleteEntry = {
                                root: document.createElement("button"),
                                parent: this,
                                handleEvent: function() {
                                    document.getElementById("popup-option-holder").removeChild(this.parent.rootDOM);
                                    var index = this.parent.parent.option.options.findIndex(function(element,index,array){
                                        if (element == this.parent.specification)
                                            return true;
                                        else
                                            return false;
                                    },this);
                                    var optionList = this.parent.parent.option.options;
                                    if (index == optionList.length-1) {
                                        optionList = optionList.slice(0,index);
                                    } else {
                                        optionList = optionList.slice(0,index).concat(optionList.slice(index+1));
                                    }
                                    this.parent.parent.option.options = optionList;
                                }
                            };
                            this.deleteEntry.root.textContent = "Delete Option";
                            this.deleteEntry.root.addEventListener("click",this.deleteEntry,false);
                            this.rootDOM.appendChild(this.deleteEntry.root);
                        }
                        this.addEntry = {
                            parent: this,
                            root: document.createElement("button"),
                            handleEvent: function() {
                                var node = {name: "name", text: "text"};
                                var optionsList = this.parent.option.options;
                                optionsList.push(node);
                                var obj = new optionObject(this.parent,optionsList[optionsList.length-1]);
                                this.parent.optionLists.push(obj);
                                document.getElementById("popup-option-holder").appendChild(obj.rootDOM);
                            }
                        }
                        this.addEntry.root.textContent = "Add Option";
                        this.addEntry.root.addEventListener("click",this.addEntry);
                        this.dynamic.appendChild(this.addEntry.root);
                        for (var i=0; i<this.option.options.length; i++)
                        {
                            var obj = new optionObject(this,this.option.options[i]);
                            this.optionLists.push(obj);
                            optionHolder.appendChild(obj.rootDOM);
                        }
                        this.dynamic.appendChild(optionHolder);
                }
            }
            this.handleEvent = function()
            {
                var name = event.currentTarget.getAttribute("name");
                var nodeName = event.currentTarget.nodeName;
                if (name == "type" && nodeName == "SELECT") {
                    // If type has changed, we may need to rebuild the entire state node
                    if (event.currentTarget.value != this.option.name)
                    {
                        this.option.type = event.currentTarget.value;
                        this.generate(this.option,this.parent);
                    }
                    return;
                }
                switch(event.currentTarget.getAttribute("type")) {
                    case "checkbox":
                        eval("this.option."+name+" = event.currentTarget.checked");
                        break;
                    default:
                        eval("this.option."+name+" = event.currentTarget.value");
                        break;
                }
            }
            this.continue = function()
            {
                if (this.parent.type == "surveyNode")
                {
                    var newNode = new this.parent.surveyEntryNode(this.parent,this.option);
                    this.parent.children.push(newNode);
                    this.parent.childrenDOM.appendChild(newNode.rootDOM);
                } else if (this.parent.type == "surveyEntryNode") {
                    this.parent.build();
                }
                popupObject.hide();
            }
        }
        this.state[6] = new function() {
            this.title = "Edit Scale Markers";
            this.content = document.createElement("div");
            this.content.id = "state-6";
            var spnH = document.createElement('div');
            var span = document.createElement("span");
            span.textContent = "You can edit your scale markers here for the selected interface.";
            spnH.appendChild(span);
            this.scaleRoot;
            this.parent;
            this.markerNodes =[];
            this.preset = {
                input: document.createElement("select"),
                parent: this,
                handleEvent: function(event) {
                    this.parent.scaleRoot.scales = [];
                    var protoScale = interfaceSpecs.getAllElementsByTagName('scaledefinitions')[0].getAllElementsByName(event.currentTarget.value)[0];
                    var protoMarkers = protoScale.children;
                    for (var i=0; i<protoMarkers.length; i++)
                    {
                        var marker = {
                            position: protoMarkers[i].getAttribute("position"),
                            text: protoMarkers[i].textContent
                        }
                        this.parent.scaleRoot.scales.push(marker);
                    }
                    this.parent.buildMarkerList();
                }
            }
            this.preset.input.addEventListener("change",this.preset);
            this.content.appendChild(this.preset.input);
            var optionHolder = document.createElement("div");
            optionHolder.className = 'node';
            optionHolder.id = 'popup-option-holder';
            this.content.appendChild(optionHolder);
            this.generate = function(scaleRoot,parent)
            {
                this.scaleRoot = scaleRoot;
                this.parent = parent;
                
                // Generate Pre-Set dropdown
                var protoScales = interfaceSpecs.getAllElementsByTagName('scaledefinitions')[0].children;
                this.preset.input.innerHTML = "";
                
                for (var i=0; i<protoScales.length; i++)
                {
                    var selectOption = document.createElement("option");
                    var scaleName = protoScales[i].getAttribute("name");
                    selectOption.setAttribute("name",scaleName);
                    selectOption.textContent = scaleName;
                    this.preset.input.appendChild(selectOption);
                }
                
                this.addMarker = {
                    root: document.createElement("button"),
                    parent: this,
                    handleEvent: function() {
                        var marker = {
                            position: 0,
                            text: "text"
                        };
                        this.parent.scaleRoot.scales.push(marker);
                        var markerNode = new this.parent.buildMarkerNode(this.parent,marker);
                        document.getElementById("popup-option-holder").appendChild(markerNode.root);
                        this.parent.markerNodes.push(markerNode);
                    }
                };
                this.addMarker.root.textContent = "Add Marker";
                this.addMarker.root.addEventListener("click",this.addMarker);
                this.content.appendChild(this.addMarker.root);
                
                // Create Marker List
                this.buildMarkerList();
            }
            this.buildMarkerList = function() {
                var markerInject = document.getElementById("popup-option-holder");
                markerInject.innerHTML = "";
                this.markerNodes = [];
                for (var i=0; i<this.scaleRoot.scales.length; i++)
                {
                    var markerNode = new this.buildMarkerNode(this,this.scaleRoot.scales[i]);
                    markerInject.appendChild(markerNode.root);
                    this.markerNodes.push(markerNode);
                    
                }
            }
            
            this.buildMarkerNode = function(parent,specification) {
                this.root = document.createElement("div");
                this.root.className = "popup-option-entry";
                this.positionInput = document.createElement("input");
                this.positionInput.min = 0;
                this.positionInput.max = 100;
                this.positionInput.value = specification.position;
                this.positionInput.setAttribute("name","position");
                this.textInput = document.createElement("input");
                this.textInput.setAttribute("name","text");
                this.textInput.style.width = "300px";
                this.textInput.value = specification.text;
                this.specification = specification;
                this.parent = parent;
                this.handleEvent = function(event) {
                    switch(event.currentTarget.getAttribute("name"))
                    {
                        case "position":
                            this.specification.position = Number(event.currentTarget.value);
                            break;
                        case "text":
                            this.specification.text = event.currentTarget.value;
                            break;
                    }
                }
                this.positionInput.addEventListener("change",this,false);
                this.textInput.addEventListener("change",this,false);

                var posText = document.createElement("span");
                posText.textContent = "Position: ";
                var textText = document.createElement("span");
                textText.textContent = "Text: ";
                this.root.appendChild(posText);
                this.root.appendChild(this.positionInput);
                this.root.appendChild(textText);
                this.root.appendChild(this.textInput);

                this.deleteMarker = {
                    root: document.createElement("button"),
                    parent: this,
                    handleEvent: function() {
                        var index = this.parent.parent.scaleRoot.scales.findIndex(function(element,index,array){
                            if (element == this) {return true;} else {return false;}
                        },this.parent.specification)
                        if (index >= 0) {
                            this.parent.parent.scaleRoot.scales.splice(index,1);
                        }
                        document.getElementById("popup-option-holder").removeChild(this.parent.root);
                    }
                }
                this.deleteMarker.root.addEventListener("click",this.deleteMarker);
                this.deleteMarker.root.textContent = "Delete Marker"
                this.root.appendChild(this.deleteMarker.root);
            }
        }
    }
}

function SpecificationToHTML()
{
    // This takes the specification node and converts it to an on-page HTML object
    // Each Specification Node is given its own JS object which listens to the XSD for instant verification
    // Once generated, it directly binds into the specification object to update with changes
    // Fixed DOM entries
    this.injectDOM;
    this.setupDOM;
    this.pages = [];
    
    // Self-contained generators
    this.createGeneralNodeDOM = function(name,id,parent)
    {
        this.type = name;
        var root = document.createElement('div');
        root.id = id;
        root.className = "node";

        var titleDiv = document.createElement('div');
        titleDiv.className = "node-title";
        var title = document.createElement('span');
        title.className = "node-title";
        title.textContent = name;
        titleDiv.appendChild(title);

        var attributeDiv = document.createElement('div');
        attributeDiv.className = "node-attributes";

        var childrenDiv = document.createElement('div');
        childrenDiv.className = "node-children";

        var buttonsDiv = document.createElement('div');
        buttonsDiv.className = "node-buttons";

        root.appendChild(titleDiv);
        root.appendChild(attributeDiv);
        root.appendChild(childrenDiv);
        root.appendChild(buttonsDiv);

        var obj = {
            rootDOM: root,
            titleDOM: title,
            attributeDOM: attributeDiv,
            attributes: [],
            childrenDOM: childrenDiv,
            children: [],
            buttonDOM: buttonsDiv,
            parent: parent
        }
        return obj;
    }
    
    this.convertAttributeToDOM = function(node,schema)
    {
        // This takes an attribute schema node and returns an object with the input node and any bindings
        if (schema.getAttribute('name') == undefined && schema.getAttribute('ref') != undefined)
		{
			schema = specification.schema.getAllElementsByName(schema.getAttribute('ref'))[0];
		}
        var obj = new function()
        {
            this.input;
            this.name;
            this.owner;
            this.holder;
            
            this.name = schema.getAttribute('name');
            this.default = schema.getAttribute('default');
            this.dataType = schema.getAttribute('type');
            if (this.dataType == undefined) {
                if (schema.childElementCount > 0) {
                    if (schema.children[0].nodeName == "xs:simpleType") {
                        this.dataType = schema.getAllElementsByTagName("xs:restriction")[0].getAttribute("base");
                    }
                }
            }
            if (typeof this.dataType == "string") { this.dataType = this.dataType.substr(3);}
            else {this.dataType = "string";}
            var minVar = undefined;
            var maxVar = undefined;
            switch(this.dataType)
            {
                case "negativeInteger":
                    maxVar = -1;
                    break;
                case "positiveInteger":
                    minVar = 1;
                    break;
                case "nonNegativeInteger":
                    minVar = 0;
                    break;
                case "nonPositiveInteger":
                    maxVar = 0;
                    break;
                case "byte":
                    minVar = 0;
                    maxVar = 256;
                    break;
                case "short":
                    minVar = 0;
                    maxVar = 65536;
                    break;
                default:
                    break;
            }
            
            this.enumeration = schema.getAllElementsByTagName("xs:enumeration");
            if (this.enumeration.length == 0) {
                this.input = document.createElement('input');
                switch(this.dataType)
                {
                    case "boolean":
                        this.input.type = "checkbox";
                        break;
                    case "negativeInteger":
                    case "positiveInteger":
                    case "nonNegativeInteger":
                    case "nonPositiveInteger":
                    case "integer":
                    case "short":
                    case "byte":
                        this.input.step = 1;
                    case "decimal":
                        this.input.type = "number";
                        this.input.min = minVar;
                        this.input.max = maxVar;
                        break;
                    default:
                        break;
                }
            } else {
                this.input = document.createElement("select");
                for (var i=0; i<this.enumeration.length; i++)
                {
                    var option = document.createElement("option");
                    var value = this.enumeration[i].getAttribute("value");
                    option.setAttribute("value",value);
                    option.textContent = value;
                    this.input.appendChild(option);
                }
            }
            var value;
            eval("value = node."+this.name)
            if (this.default != undefined && value == undefined)
            {
                value = this.default;
            }
            if (this.input.type == "checkbox") {
                if (value == "true" || value == "True") {this.input.checked = false;}
                else {this.input.checked = false;}
            } else {
                this.input.value = value;
            }
            this.handleEvent = function(event)
            {
                var value;
                if (this.input.nodeName == "INPUT")
                {
                    switch(this.input.type)
                    {
                        case "checkbox":
                            value = event.currentTarget.checked;
                            break;
                        case "number":
                            value = Number(event.currentTarget.value);
                            break;
                        default:
                            value = event.currentTarget.value;
                            break;                    
                    }
                } else if (this.input.nodeName == "SELECT") {
                    value = event.currentTarget.value;
                }
                eval("this.owner."+this.name+" = value");
            }
            this.holder = document.createElement('div');
            this.holder.className = "attribute";
            this.holder.setAttribute('name',this.name);
            var text = document.createElement('span');
            eval("text.textContent = attributeText."+this.name+"+': '");
            this.holder.appendChild(text);
            this.holder.appendChild(this.input);
            this.owner = node;
            this.input.addEventListener("change",this,false);
        }
        if (obj.attribute != null)
        {
            obj.input.value = obj.attribute;
        }
        return obj;
    }
    
    this.convert = function(root)
    {
        //Performs the actual conversion using the given root DOM as the root
        this.injectDOM = root;
        
        // Build the export button
        var exportButton = document.createElement("button");
        exportButton.textContent = "Export to XML";
        exportButton.onclick = function()
        {
            var doc = specification.encode();
            var obj = {};
            obj.title = "Export";
            obj.content = document.createElement("div");
            obj.content.id = "finish";
            var span = document.createElement("span");
            span.textContent = "Your XML document is linked below. On most browsers, simply right click on the link and select 'Save As'. Or clicking on the link may download the file directly."
            obj.content.appendChild(span);
            var link = document.createElement("div");
            link.appendChild(doc.children[0]);
            var file = [link.innerHTML];
            var bb = new Blob(file,{type : 'application/xml'});
            var dnlk = window.URL.createObjectURL(bb);
            var a = document.createElement("a");
            a.hidden = '';
            a.href = dnlk;
            a.download = "project-specification.xml";
            a.textContent = "Save File";
            obj.content.appendChild(a);
            popupObject.show();
            popupObject.postNode(obj);
        }
        this.injectDOM.appendChild(exportButton);
        
        // First perform the setupNode;
        var setupSchema = specification.schema.getAllElementsByName('setup')[0];
        this.setupDOM = new this.createGeneralNodeDOM('Global Configuration','setup',null);
        this.injectDOM.appendChild(this.setupDOM.rootDOM);
        var setupAttributes = setupSchema.getAllElementsByTagName('xs:attribute');
        for (var i=0; i<setupAttributes.length; i++)
        {
            var attributeName = setupAttributes[i].getAttribute('name');
            var attrObject = this.convertAttributeToDOM(specification,setupAttributes[i]);
            this.setupDOM.attributeDOM.appendChild(attrObject.holder);
            this.setupDOM.attributes.push(attrObject);
        }
        
        // Build the exit Text node
        var exitText = new this.createGeneralNodeDOM("Exit Text","exit-test",this.setupDOM);
        exitText.rootDOM.removeChild(exitText.attributeDOM);
        this.setupDOM.children.push(exitText);
        this.setupDOM.childrenDOM.appendChild(exitText.rootDOM);
        var obj = {
            rootDOM: document.createElement("div"),
            labelDOM: document.createElement("label"),
            inputDOM: document.createElement("textarea"),
            parent: exitText,
            specification: specification,
            handleEvent: function(event) {
                this.specification.exitText = this.inputDOM.value;
            }
        }
        obj.rootDOM.appendChild(obj.labelDOM);
        obj.rootDOM.appendChild(obj.inputDOM);
        obj.labelDOM.textContent = "Text: ";
        obj.inputDOM.value = obj.specification.exitText;
        obj.inputDOM.addEventListener("change",obj);
        exitText.children.push(obj);
        exitText.childrenDOM.appendChild(obj.rootDOM);
        
        // Now we must build the interface Node
        this.interfaceDOM = new this.interfaceNode(this,specification.interfaces);
        this.interfaceDOM.build("Interface","setup-interface",this.setupDOM.rootDOM);
        
        // Now build the Metrics selection node
        var metric = this.createGeneralNodeDOM("Session Metrics","setup-metric",this.setupDOM);
        metric.rootDOM.removeChild(metric.attributeDOM);
        this.setupDOM.children.push(metric);
        this.setupDOM.childrenDOM.appendChild(metric.rootDOM);
        var interfaceName = popupStateNodes.state[1].select.value;
        var checkText = interfaceSpecs.getElementsByTagName("global")[0].getAllElementsByTagName("metrics")[0];
        var testXML = interfaceSpecs.getElementsByTagName("tests")[0].getAllElementsByName(interfaceName)[0];
        var interfaceXML = interfaceSpecs.getAllElementsByTagName("interfaces")[0].getAllElementsByName(testXML.getAttribute("interface"))[0].getAllElementsByTagName("metrics")[0];
        testXML = testXML.getAllElementsByTagName("metrics");
        for (var i=0; i<interfaceXML.children.length; i++)
        {
            var obj = {
                input: document.createElement('input'),
                root: document.createElement('div'),
                text: document.createElement('span'),
                specification: specification.metrics.enabled,
                name: interfaceXML.children[i].getAttribute("name"),
                handleEvent: function()
                {
                    for (var i=0; i<this.specification.length; i++)
                    {
                        if (this.specification[i] == this.name)
                        {
                            var options = this.specification;
                            if (this.input.checked == false) {
                                if (i == options.length)
                                {options = options.slice(0,i);}
                                else {
                                    options = options.slice(0,i).concat(options.slice(i+1));
                                }
                            } else {
                                return;
                            }
                            this.specification = options;
                            break;
                        }
                    }
                    if (this.input.checked) {
                        this.specification.push(this.name);
                    }
                }
            };
            obj.root.className = "attribute";
            obj.input.type = "checkbox";
            obj.root.appendChild(obj.text);
            obj.root.appendChild(obj.input);
            obj.text.textContent = checkText.children[i].textContent;
            metric.children.push(obj);
            metric.childrenDOM.appendChild(obj.root);
            for (var j=0; j<specification.metrics.enabled.length; j++)
            {
                if (specification.metrics.enabled[j] == obj.name)
                {
                    obj.input.checked = true;
                    break;
                }
            }
        }
        
        // Now both before and after surveys
        if (specification.preTest == undefined){
            specification.preTest = new specification.surveyNode(specification);
            specification.preTest.location = "pre";
        }
        if (specification.postTest == undefined){
            specification.postTest = new specification.surveyNode(specification);
            specification.postTest.location = "post";
        }
        var surveyBefore = new this.surveyNode(this,specification.preTest,"Pre");
        var surveyAfter = new this.surveyNode(this,specification.postTest,"Post");
        this.setupDOM.children.push(surveyBefore);
        this.setupDOM.children.push(surveyAfter);
        this.setupDOM.childrenDOM.appendChild(surveyBefore.rootDOM);
        this.setupDOM.childrenDOM.appendChild(surveyAfter.rootDOM);
        
        // Add in the page creator button
        this.addPage = {
            root: document.createElement("button"),
            parent: this,
            handleEvent: function()
            {
                var pageObj = new specification.page(specification);
                specification.pages.push(pageObj);
                var newPage = new this.parent.pageNode(this.parent,pageObj);
                this.parent.injectDOM.appendChild(newPage.rootDOM);
                this.parent.pages.push(newPage);
            }
        }
        this.addPage.root.textContent = "Add Page";
        this.addPage.root.addEventListener("click",this.addPage,false);
        this.injectDOM.appendChild(this.addPage.root);
        
        // Build each page
        for (var page of specification.pages)
        {
            var newPage = new this.pageNode(this,page);
            this.injectDOM.appendChild(newPage.rootDOM);
            this.pages.push(newPage);
        }
    }
    
    this.interfaceNode = function(parent,rootObject)
    {
        this.type = "interfaceNode";
        this.rootDOM;
        this.titleDOM;
        this.attributeDOM;
        this.attributes = [];
        this.childrenDOM;
        this.children = [];
        this.buttonDOM;
        this.parent = parent;
        this.HTMLPoint;
        this.specification = rootObject;
        this.schema = specification.schema.getAllElementsByName("interface")[1];
        
        this.createIOasAttr = function(name,specification,parent,type) {
            this.root = document.createElement('div');
            this.input = document.createElement("input");
            this.name = name;
            this.type = type;
            this.parent = parent;
            this.specification = specification;
            this.handleEvent = function(event) {
                for (var i=0; i<this.specification.options.length; i++)
                {
                    if (this.specification.options[i].name == this.name)
                    {
                        var options = this.specification.options;
                        if (this.input.checked == false) {
                            if (i == options.length)
                            {options = options.slice(0,i);}
                            else {
                                options = options.slice(0,i).concat(options.slice(i+1));
                            }
                        } else {
                            return;
                        }
                        this.specification.options = options;
                        break;
                    }
                }
                if (this.input.checked) {
                    var obj = {
                        name: this.name,
                        type: this.type
                    };
                    this.specification.options.push(obj);
                }
                if (this.parent.HTMLPoint.id == "setup")
                {
                    // We've changed a global setting, must update all child 'interfaces' and disable them
                    for (pages of convert.pages)
                    {
                        for (interface of pages.interfaces)
                        {
                            if (this.type == "check")
                            {
                                for (node of interface.children[0].attributes)
                                {
                                    if (node.name == this.name) {
                                        if (this.input.checked) {
                                            node.input.disabled = true;
                                            node.input.checked = false;
                                        } else {
                                            node.input.disabled = false;
                                        }
                                        break;
                                    }
                                }
                            } else if (this.type == "show")
                            {
                                for (node of interface.children[1].attributes)
                                {
                                    if (node.name == this.name) {
                                        if (this.input.checked) {
                                            node.input.disabled = true;
                                        } else {
                                            node.input.disabled = false;
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            };
            this.findIndex = function(element,index,array){
                if (element.name == this.name)
                    return true;
                else
                    return false;
            };
            this.findNode = function(element,index,array){
                if (element.name == this.name)
                    return true;
                else
                    return false;
            };
            this.input.type = "checkbox";
            this.input.setAttribute("name",name);
            this.input.addEventListener("change",this,false);
            this.root.appendChild(this.input);
            this.root.className = "attribute";
            return this;
        }
        
        this.build = function(name,id,parent)
        {
            var obj = this.parent.createGeneralNodeDOM(name,id,parent);
            
            this.rootDOM = obj.rootDOM;
            this.titleDOM = obj.titleDOM;
            this.attributeDOM = obj.attributeDOM;
            this.childrenDOM = obj.childrenDOM;
            this.buttonDOM = obj.buttonsDOM;
            this.HTMLPoint = parent;
            this.rootDOM.removeChild(this.attributeDOM);
            if (parent.id != "setup") {
                // Put in the <title> node:
                this.titleNode = {
                    root: document.createElement("div"),
                    label: document.createElement("span"),
                    input: document.createElement("input"),
                    parent: this,
                    handleEvent: function(event) {
                        this.parent.specification.title = event.currentTarget.value;
                    }
                }
                this.titleNode.label.textContent = "Axis Title:";
                this.titleNode.root.className = "node-children";
                this.titleNode.root.appendChild(this.titleNode.label);
                this.titleNode.root.appendChild(this.titleNode.input);
                this.titleNode.input.addEventListener("change",this.titleNode,false);
                this.titleNode.input.value = this.specification.title;
                this.children.push(this.titleNode);
                this.childrenDOM.appendChild(this.titleNode.root);
            }
            
            // Put in the check / show options as individual children
            var checks = this.parent.createGeneralNodeDOM("Checks","setup-interface-checks",this);

            var interfaceName = popupStateNodes.state[1].select.value;
            var checkText = interfaceSpecs.getElementsByTagName("global")[0].getAllElementsByTagName("checks")[0];
            var testXML = interfaceSpecs.getElementsByTagName("tests")[0].getAllElementsByName(interfaceName)[0];
            var interfaceXML = interfaceSpecs.getAllElementsByTagName("interfaces")[0].getAllElementsByName(testXML.getAttribute("interface"))[0].getAllElementsByTagName("checks")[0];
            testXML = testXML.getAllElementsByTagName("checks");
            for (var i=0; i<interfaceXML.children.length; i++)
            {
                var obj = new this.createIOasAttr(interfaceXML.children[i].getAttribute("name"),this.specification,this,"check");
                for (var option  of this.specification.options)
                {
                    if (option.name == obj.name)
                    {
                        obj.input.checked = true;
                        break;
                    }
                }
                if (parent.id != "setup") {
                    var node = convert.interfaceDOM.children[0].attributes.find(obj.findNode,obj);
                    if (node != undefined) {
                        if (node.input.checked) {
                            obj.input.checked = false;
                            obj.input.disabled = true;
                        }
                    }
                }
                var text = document.createElement('span');
                text.textContent = checkText.children[i].textContent;
                obj.root.appendChild(text);
                checks.attributeDOM.appendChild(obj.root);
                checks.attributes.push(obj);
            }
            this.children.push(checks);
            this.childrenDOM.appendChild(checks.rootDOM);

            var show = this.parent.createGeneralNodeDOM("Show","setup-interface-show",this);
            interfaceName = popupStateNodes.state[1].select.value;
            checkText = interfaceSpecs.getElementsByTagName("global")[0].getAllElementsByTagName("show")[0];
            testXML = interfaceSpecs.getElementsByTagName("tests")[0].getAllElementsByName(interfaceName)[0];
            interfaceXML = interfaceSpecs.getAllElementsByTagName("interfaces")[0].getAllElementsByName(testXML.getAttribute("interface"))[0].getAllElementsByTagName("show")[0];
            testXML = testXML.getAllElementsByTagName("show");
            for (var i=0; i<interfaceXML.children.length; i++)
            {
                var obj = new this.createIOasAttr(interfaceXML.children[i].getAttribute("name"),this.specification,this,"show");
                for (var option  of this.specification.options)
                {
                    if (option.name == obj.name)
                    {
                        obj.input.checked = true;
                        break;
                    }
                }
                if (parent.id != "setup") {
                    var node = convert.interfaceDOM.children[0].attributes.find(obj.findNode,obj);
                    if (node != undefined) {
                        if (node.input.checked) {
                            obj.input.checked = false;
                            obj.input.disabled = true;
                        }
                    }
                }
                var text = document.createElement('span');
                text.textContent = checkText.children[i].textContent;
                obj.root.appendChild(text);
                show.attributeDOM.appendChild(obj.root);
                show.attributes.push(obj);
            }
            this.children.push(show);
            this.childrenDOM.appendChild(show.rootDOM);
            
            if (parent.id == "setup")
            {
            } else {
                var nameAttr = this.parent.convertAttributeToDOM(this,specification.schema.getAllElementsByName("name")[0]);
                this.attributeDOM.appendChild(nameAttr.holder);
                this.attributes.push(nameAttr);
                var scales = new this.scalesNode(this,this.specification);
                this.children.push(scales);
                this.childrenDOM.appendChild(scales.rootDOM);
            }
            if (parent != undefined)
            {
                parent.appendChild(this.rootDOM);
            }
        }
        
        this.scalesNode = function(parent,rootObject)
        {
            this.type = "scalesNode";
            this.rootDOM = document.createElement("div");
            this.titleDOM = document.createElement("span");
            this.attributeDOM = document.createElement("div");
            this.attributes = [];
            this.childrenDOM = document.createElement("div");
            this.children = [];
            this.buttonDOM = document.createElement("div");
            this.parent = parent;
            this.specification = rootObject;
            this.schema = specification.schema.getAllElementsByName("page")[0];
            this.rootDOM.className = "node";

            var titleDiv = document.createElement('div');
            titleDiv.className = "node-title";
            this.titleDOM.className = "node-title";
            this.titleDOM.textContent = "Interface Scales";
            titleDiv.appendChild(this.titleDOM);

            this.attributeDOM.className = "node-attributes";
            this.childrenDOM.className = "node-children";
            this.buttonDOM.className = "node-buttons";

            this.rootDOM.appendChild(titleDiv);
            this.rootDOM.appendChild(this.attributeDOM);
            this.rootDOM.appendChild(this.childrenDOM);
            this.rootDOM.appendChild(this.buttonDOM);
            
            this.editButton = {
                button: document.createElement("button"),
                parent: this,
                handleEvent: function(event) {
                    popupObject.show();
                    popupObject.postNode(popupStateNodes.state[6]);
                    popupStateNodes.state[6].generate(this.parent.specification,this.parent);
                }
            };
            this.editButton.button.textContent = "Edit Scales/Markers";
            this.editButton.button.addEventListener("click",this.editButton,false);
            this.buttonDOM.appendChild(this.editButton.button);
        }
    }
    
    this.surveyNode = function(parent,rootObject,location)
    {
        this.type = "surveyNode";
        this.rootDOM = document.createElement("div");
        this.titleDOM = document.createElement("span");
        this.attributeDOM = document.createElement("div");
        this.attributes = [];
        this.childrenDOM = document.createElement("div");
        this.children = [];
        this.buttonDOM = document.createElement("div");
        this.parent = parent;
        this.specification = rootObject;
        this.schema = specification.schema.getAllElementsByName("survey")[1];
        this.rootDOM.className = "node";

        var titleDiv = document.createElement('div');
        titleDiv.className = "node-title";
        this.titleDOM.className = "node-title";
        this.titleDOM.textContent = "Survey";
        titleDiv.appendChild(this.titleDOM);
        
        this.attributeDOM.className = "node-attributes";
        var locationAttr = document.createElement("span");
        this.attributeDOM.appendChild(locationAttr);
        if (location == "Pre" || location == "pre") {
            locationAttr.textContent = "Location: Before";
        } else {
            locationAttr.textContent = "Location: After";
        }
        this.childrenDOM.className = "node-children";
        this.buttonDOM.className = "node-buttons";

        this.rootDOM.appendChild(titleDiv);
        this.rootDOM.appendChild(this.attributeDOM);
        this.rootDOM.appendChild(this.childrenDOM);
        this.rootDOM.appendChild(this.buttonDOM);
        
        this.surveyEntryNode = function(parent,rootObject)
        {
            this.type = "surveyEntryNode";
            this.rootDOM = document.createElement("div");
            this.titleDOM = document.createElement("span");
            this.attributeDOM = document.createElement("div");
            this.attributes = [];
            this.childrenDOM = document.createElement("div");
            this.children = [];
            this.buttonDOM = document.createElement("div");
            this.parent = parent;
            this.specification = rootObject;
            this.schema = specification.schema.getAllElementsByName("surveyentry")[1];

            this.rootDOM.className = "node";
            this.rootDOM.style.minWidth = "50%";

            var titleDiv = document.createElement('div');
            titleDiv.className = "node-title";
            this.titleDOM.className = "node-title";
            titleDiv.appendChild(this.titleDOM);

            this.attributeDOM.className = "node-attributes";
            this.childrenDOM.className = "node-children";
            this.buttonDOM.className = "node-buttons";

            this.rootDOM.appendChild(titleDiv);
            this.rootDOM.appendChild(this.attributeDOM);
            this.rootDOM.appendChild(this.childrenDOM);
            this.rootDOM.appendChild(this.buttonDOM);
            
            this.build = function()
            {
                this.attributeDOM.innerHTML = null;
                this.childrenDOM.innerHTML = null;
                var statementRoot = document.createElement("div");
                var statement = document.createElement("span");
                statement.textContent = "Statement / Question: "+this.specification.statement;
                statementRoot.appendChild(statement);
                this.children.push(statementRoot);
                this.childrenDOM.appendChild(statementRoot);
                switch(this.specification.type)
                {
                    case "statement":
                        this.titleDOM.textContent = "Statement";
                        break;
                    case "question":
                        this.titleDOM.textContent = "Question";
                        var id = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("id")[0]);
                        var mandatory = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("mandatory")[0]);
                        var boxsize = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("boxsize")[0]);
                        this.attributeDOM.appendChild(id.holder);
                        this.attributes.push(id);
                        this.attributeDOM.appendChild(mandatory.holder);
                        this.attributes.push(mandatory);
                        this.attributeDOM.appendChild(boxsize.holder);
                        this.attributes.push(boxsize);
                        break;
                    case "number":
                        this.titleDOM.textContent = "Number";
                        var id = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("id")[0]);
                        var mandatory = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("mandatory")[0]);
                        var min = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("min")[0]);
                        var max = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("max")[0]);
                        this.attributeDOM.appendChild(id.holder);
                        this.attributes.push(id);
                        this.attributeDOM.appendChild(min.holder);
                        this.attributes.push(min);
                        this.attributeDOM.appendChild(max.holder);
                        this.attributes.push(max);
                        break;
                    case "checkbox":
                        this.titleDOM.textContent = "Checkbox";
                        var id = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("id")[0]);
                        this.attributeDOM.appendChild(id.holder);
                        this.attributes.push(id);
                        break;
                    case "radio":
                        this.titleDOM.textContent = "Radio";
                        var id = convert.convertAttributeToDOM(this.specification,specification.schema.getAllElementsByName("id")[0]);
                        this.attributeDOM.appendChild(id.holder);
                        this.attributes.push(id);
                        break;
                }
            }
            this.build();
            
            this.editNode = {
                root: document.createElement("button"),
                parent: this,
                handleEvent: function()
                {
                    popupObject.show();
                    popupStateNodes.state[5].generate(this.parent.specification,this.parent);
                    popupObject.postNode(popupStateNodes.state[5]);
                }
            }
            this.editNode.root.textContent = "Edit Entry";
            this.editNode.root.addEventListener("click",this.editNode,false);
            this.buttonDOM.appendChild(this.editNode.root);
            
            this.deleteNode = {
                root: document.createElement("button"),
                parent: this,
                handleEvent: function()
                {
                    var optionList = this.parent.parent.specification.options;
                    var childList = this.parent.parent.children;
                    for (var i=0; i <this.parent.parent.specification.options.length; i++)
                    {
                        var option = this.parent.parent.specification.options[i];
                        if (option == this.parent.specification)
                        {
                            this.parent.parent.childrenDOM.removeChild(this.parent.rootDOM);
                            if (i == this.parent.parent.specification.options.length-1)
                            {
                                optionList = optionList.slice(0,i);
                                childList = childList.slice(0,i);
                            }
                            else {
                                optionList = optionList.slice(0,i).concat(optionList.slice(i+1));
                                childList = childList.slice(0,i).concat(childList.slice(i+1));
                            }
                            this.parent.parent.specification.options = optionList;
                            this.parent.parent.children = childList;
                        }
                    }
                }
            }
            this.deleteNode.root.textContent = "Delete Entry";
            this.deleteNode.root.addEventListener("click",this.deleteNode,false);
            this.buttonDOM.appendChild(this.deleteNode.root);
        }
        this.addNode = {
            root: document.createElement("button"),
            parent: this,
            handleEvent: function()
            {
                var newNode = new this.parent.specification.OptionNode(this.parent.specification);
                this.parent.specification.options.push(newNode);
                popupObject.show();
                popupStateNodes.state[5].generate(newNode,this.parent);
                popupObject.postNode(popupStateNodes.state[5]);
            }
        }
        this.addNode.root.textContent = "Add Survey Entry";
        this.addNode.root.addEventListener("click",this.addNode,false);
        this.buttonDOM.appendChild(this.addNode.root);
        
        for (var option of this.specification.options)
        {
            var newNode = new this.surveyEntryNode(this,option);
            this.children.push(newNode);
            this.childrenDOM.appendChild(newNode.rootDOM);
        }
    }
    
    this.pageNode = function(parent,rootObject)
    {
        this.type = "pageNode";
        this.rootDOM = document.createElement("div");
        this.titleDOM = document.createElement("span");
        this.attributeDOM = document.createElement("div");
        this.attributes = [];
        this.childrenDOM = document.createElement("div");
        this.children = [];
        this.buttonDOM = document.createElement("div");
        this.parent = parent;
        this.specification = rootObject;
        this.schema = specification.schema.getAllElementsByName("page")[0];
        this.rootDOM.className = "node";

        var titleDiv = document.createElement('div');
        titleDiv.className = "node-title";
        this.titleDOM.className = "node-title";
        this.titleDOM.textContent = "Test Page";
        titleDiv.appendChild(this.titleDOM);
        
        this.attributeDOM.className = "node-attributes";
        this.childrenDOM.className = "node-children";
        this.buttonDOM.className = "node-buttons";

        this.rootDOM.appendChild(titleDiv);
        this.rootDOM.appendChild(this.attributeDOM);
        this.rootDOM.appendChild(this.childrenDOM);
        this.rootDOM.appendChild(this.buttonDOM);
        
        // Do the comment prefix node
        var cpn = this.parent.createGeneralNodeDOM("Comment Prefix",""+this.specification.id+"-commentprefix",this.parent);
        cpn.rootDOM.removeChild(cpn.attributeDOM);
        var obj = {
            root: document.createElement("div"),
            input: document.createElement("input"),
            parent: this,
            handleEvent: function()
            {
                this.parent.specification.commentBoxPrefix = event.currentTarget.value;
            }
        }
        cpn.children.push(obj);
        cpn.childrenDOM.appendChild(obj.root);
        obj.root.appendChild(obj.input);
        obj.input.addEventListener("change",obj,false);
        obj.input.value = this.specification.commentBoxPrefix;
        this.childrenDOM.appendChild(cpn.rootDOM);
        this.children.push(cpn);
        
        // Now both before and after surveys
        if (this.specification.preTest == undefined){
            this.specification.preTest = new specification.surveyNode(specification);
            this.specification.preTest.location = "pre";
        }
        if (this.specification.postTest == undefined){
            this.specification.postTest = new specification.surveyNode(specification);
            this.specification.postTest.location = "post";
        }
        var surveyBefore = new this.parent.surveyNode(this,this.specification.preTest,"Pre");
        var surveyAfter = new this.parent.surveyNode(this,this.specification.postTest,"Post");
        this.children.push(surveyBefore);
        this.children.push(surveyAfter);
        this.childrenDOM.appendChild(surveyBefore.rootDOM);
        this.childrenDOM.appendChild(surveyAfter.rootDOM);
        
        // Build the attributes
        var attributeList = this.schema.getAllElementsByTagName("xs:attribute");
        for (var i=0; i<attributeList.length; i++)
        {
            var attributeName = attributeList[i].getAttribute('name');
            var attrObject = this.parent.convertAttributeToDOM(rootObject,attributeList[i]);
            this.attributeDOM.appendChild(attrObject.holder);
            this.attributes.push(attrObject);
        }
        
        this.interfaces = [];
        
        this.audioElementNode = function(parent,rootObject)
        {
            this.type = "audioElementNode";
            this.rootDOM = document.createElement("div");
            this.titleDOM = document.createElement("span");
            this.attributeDOM = document.createElement("div");
            this.attributes = [];
            this.childrenDOM = document.createElement("div");
            this.children = [];
            this.buttonDOM = document.createElement("div");
            this.parent = parent;
            this.specification = rootObject;
            this.schema = specification.schema.getAllElementsByName("audioelement")[0];
            this.rootDOM.className = "node";

            var titleDiv = document.createElement('div');
            titleDiv.className = "node-title";
            this.titleDOM.className = "node-title";
            this.titleDOM.textContent = "Audio Element";
            titleDiv.appendChild(this.titleDOM);

            this.attributeDOM.className = "node-attributes";
            this.childrenDOM.className = "node-children";
            this.buttonDOM.className = "node-buttons";

            this.rootDOM.appendChild(titleDiv);
            this.rootDOM.appendChild(this.attributeDOM);
            this.rootDOM.appendChild(this.childrenDOM);
            this.rootDOM.appendChild(this.buttonDOM);
            
            // Build the attributes
            var attributeList = this.schema.getAllElementsByTagName("xs:attribute");
            for (var i=0; i<attributeList.length; i++)
            {
                var attributeName = attributeList[i].getAttribute('name');
                var attrObject = this.parent.parent.convertAttributeToDOM(rootObject,attributeList[i]);
                this.attributeDOM.appendChild(attrObject.holder);
                this.attributes.push(attrObject);
            }
            
            this.deleteNode = {
                root: document.createElement("button"),
                parent: this,
                handleEvent: function()
                {
                    var i = this.parent.parent.specification.audioElements.findIndex(this.findNode,this);
                    if (i >= 0) {
                        var aeList = this.parent.parent.specification.audioElements;
                        if (i < aeList.length-1) {
                            aeList = aeList.slice(0,i).concat(aeList.slice(i+1));
                        } else {
                             aeList = aeList.slice(0,i);
                        }
                    }
                    i = this.parent.parent.children.findIndex(function(element,index,array){
                        if (element == this.parent)
                            return true;
                        else
                            return false;
                        },this);
                    if (i >= 0) {
                        var childList = this.parent.children;
                        if (i < aeList.length-1) {
                            childList = childList.slice(0,i).concat(childList.slice(i+1));
                        } else {
                             childList = childList.slice(0,i);
                        }
                        this.parent.parent.childrenDOM.removeChild(this.parent.rootDOM);
                    }
                },
                findNode: function(element,index,array){
                    if (element == this.parent.specification)
                        return true;
                    else
                        return false;
                }
            }
            this.deleteNode.root.textContent = "Delete Entry";
            this.deleteNode.root.addEventListener("click",this.deleteNode,false);
            this.buttonDOM.appendChild(this.deleteNode.root);
        }
        
        this.commentQuestionNode = function(parent,rootObject)
        {
            this.type = "commentQuestionNode";
            this.rootDOM = document.createElement("div");
            this.titleDOM = document.createElement("span");
            this.attributeDOM = document.createElement("div");
            this.attributes = [];
            this.childrenDOM = document.createElement("div");
            this.children = [];
            this.buttonDOM = document.createElement("div");
            this.parent = parent;
            this.specification = rootObject;
            this.schema = specification.schema.getAllElementsByName("page")[0];
            this.rootDOM.className = "node";

            var titleDiv = document.createElement('div');
            titleDiv.className = "node-title";
            this.titleDOM.className = "node-title";
            this.titleDOM.textContent = "Test Page";
            titleDiv.appendChild(this.titleDOM);

            this.attributeDOM.className = "node-attributes";
            this.childrenDOM.className = "node-children";
            this.buttonDOM.className = "node-buttons";

            this.rootDOM.appendChild(titleDiv);
            this.rootDOM.appendChild(this.attributeDOM);
            this.rootDOM.appendChild(this.childrenDOM);
            this.rootDOM.appendChild(this.buttonDOM);
            
        }
        
        // Build the components
        if (this.specification.interfaces.length == 0) {
            this.specification.interfaces.push(new specification.interfaceNode(specification));
        }
        for (var interfaceObj of this.specification.interfaces)
        {
            var newInterface = new this.parent.interfaceNode(this.parent,interfaceObj);
            newInterface.build("Interface",""+this.specification.id+"-interface",this.childrenDOM);
            this.children.push(newInterface);
            this.interfaces.push(newInterface);
        }
        
        for (var elements of this.specification.audioElements)
        {
            var audioElementDOM = new this.audioElementNode(this,elements);
            this.children.push(audioElementDOM);
            this.childrenDOM.appendChild(audioElementDOM.rootDOM);
        }
        
        this.addInterface = {
            root: document.createElement("button"),
            parent: this,
            handleEvent: function() {
                var InterfaceObj = new specification.interfaceNode(specification);
                var newInterface = new this.parent.parent.interfaceNode(this.parent.parent,InterfaceObj);
                newInterface.build("Interface",""+this.parent.specification.id+"-interface",this.parent.childrenDOM);
                this.parent.children.push(newInterface);
                this.parent.specification.interfaces.push(InterfaceObj);
                this.parent.interfaces.push(newInterface);
            }
        }
        this.addInterface.root.textContent = "Add Interface";
        this.addInterface.root.addEventListener("click",this.addInterface,false);
        this.buttonDOM.appendChild(this.addInterface.root);
        
        this.addAudioElement = {
            root: document.createElement("button"),
            parent: this,
            handleEvent: function() {
                var audioElementObject = new this.parent.specification.audioElementNode(specification);
                var audioElementDOM = new this.parent.audioElementNode(this.parent,audioElementObject);
                this.parent.specification.audioElements.push(audioElementObject);
                this.parent.children.push(audioElementDOM);
                this.parent.childrenDOM.appendChild(audioElementDOM.rootDOM);
            }
        }
        this.addAudioElement.root.textContent = "Add Audio Element";
        this.addAudioElement.root.addEventListener("click",this.addAudioElement,false);
        this.buttonDOM.appendChild(this.addAudioElement.root);
    }
}
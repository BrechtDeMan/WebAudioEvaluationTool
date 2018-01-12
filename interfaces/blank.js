/**
 * WAET Blank Template
 * Use this to start building your custom interface
 */

// Once this is loaded and parsed, begin execution
loadInterface();

function loadInterface() {
    // Use this to do any one-time page / element construction. For instance, placing any stationary text objects,
    // holding div's, or setting up any nodes which are present for the entire test sequence
}

function loadTest(page) {
    // Called each time a new test page is to be build. The page specification node is the only item passed in
}

function interfaceObject() {
    // An example node, you can make this however you want for each audioElement.
    // However, every audioObject (audioEngineContext.audioObject) MUST have an interface object with the following
    // You attach them by calling audioObject.bindInterface( )
    this.enable = function () {
        // This is used to tell the interface object that playback of this node is ready
    };
    this.updateLoading = function (progress) {
        // progress is a value from 0 to 100 indicating the current download state of media files
    };
    this.startPlayback = function () {
        // Called when playback has begun
    };
    this.stopPlayback = function () {
        // Called when playback has stopped. This gets called even if playback never started!
    };
    this.getValue = function () {
        // Return the current value of the object. If there is no value, return 0
    };
    this.getPresentedId = function () {
        // Return the presented ID of the object. For instance, the APE has sliders starting from 0. Whilst AB has alphabetical scale
    };
    this.canMove = function () {
        // Return either true or false if the interface object can be moved. AB / Reference cannot, whilst sliders can and therefore have a continuous scale.
        // These are checked primarily if the interface check option 'fragmentMoved' is enabled.
    };
    this.exportXMLDOM = function (audioObject) {
        // Called by the audioObject holding this element to export the interface <value> node.
        // If there is no value node (such as outside reference), return null
        // If there are multiple value nodes (such as multiple scale / 2D scales), return an array of nodes with each value node having an 'interfaceName' attribute
        // Use storage.document.createElement('value'); to generate the XML node.

    };
    this.error = function () {
        // If there is an error with the audioObject, this will be called to indicate a failure
    };
}

function resizeWindow(event) {
    // Called on every window resize event, use this to scale your page properly
}

function pageXMLSave(store, pageSpecification) {
    // MANDATORY
    // Saves a specific test page
    // You can use this space to add any extra nodes to your XML <audioHolder> saves
    // Get the current <page> information in store (remember to appendChild your data to it)
    // pageSpecification is the current page node configuration
    // To create new XML nodes, use storage.document.createElement();
}

// Script to load the relevant JS files if the system supports it
/*globals window, document */
window.onload = function () {
    // First check if the Web Audio API is supported
    if (window.AudioContext === undefined && window.webkitAudioContext === undefined) {
        // Display unsuported error message
        var body = document.getElementsByTagName("body")[0];
        body.innerHTML = "<h1>Sorry! Your browser is not supported :(</h1><p>Your browser does not support the HTML5 Web Audio API. Please use one of the following supported browsers instead.<p>";
        var table = document.createElement("table");
        table.border = "0";
        table.innerHTML = "<tr><td>Chrome</td><td>v10 or newer</td></tr>";
        table.innerHTML += "<tr><td>Firefox</td><td>v25 or newer</td></tr><tr><td>Safari (OSX)</td><td> v6 or newer, OSX only</td></tr>";
        table.innerHTML += "<tr><td>Safari (iOS)</td><td>iOS 6.1 or newer</td></tr>";
        table.innerHTML += "<tr><td>Edge</td><td>12 or newer</td></tr>";
        body.appendChild(table);
    } else {
        var head = document.getElementsByTagName("head")[0];
        var src_list = ['js/specification.js', 'js/core.js', 'js/loudness.js', 'js/xmllint.js', 'js/WAVE.js'];
        for (var i = 0; i < src_list.length; i++) {
            var src = src_list[i];
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.async = false;
            script.defer = true;
            script.src = src;
            head.appendChild(script);
        }
    }
};

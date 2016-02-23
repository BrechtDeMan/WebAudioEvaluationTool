/*
* Analysis script for WAET
*/

var chartContext;
window.onload = function() {
    // Load the Visualization API and the corechart package.
      google.charts.load('current', {'packages':['corechart']});
    chartContext = new Chart();
}

function Chart() {
    this.data = null;
    
    this.getValueData = function() {
        var XMLHttp = new XMLHttpRequest();
        XMLHttp.parent = this;
        XMLHttp.open("GET","comment_parser.php?format=JSON",true);
        XMLHttp.onload = function() {
            // Now we have the JSON data, extract
            this.parent.data = JSON.parse(this.responseText);
        }
        XMLHttp.send();
    }
    
    this.drawMean = function() {
        // First we must get the value data
    }
}
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
    this.valueData = null;
    this.commentData = null;
    this.loadStatus = 0;
    
    var XMLHttp = new XMLHttpRequest();
    XMLHttp.parent = this;
    XMLHttp.open("GET","../scripts/score_parser.php?format=JSON",true);
    XMLHttp.onload = function() {
        // Now we have the JSON data, extract
        this.parent.valueData = JSON.parse(this.responseText);
        this.parent.loadStatus++;
    }
    XMLHttp.send();
    var XMLHttp2 = new XMLHttpRequest();
    XMLHttp2.parent = this;
    XMLHttp2.open("GET","../scripts/comment_parser.php?format=JSON",true);
    XMLHttp2.onload = function() {
        // Now we have the JSON data, extract
        this.parent.commentData = JSON.parse(this.responseText);
        this.parent.loadStatus++;
    }
    XMLHttp2.send();
    
    this.drawMean = function() {
        // First we must get the value data
        if (this.valueData == null) {
            console.log("Error - Data not loaded");
            return;
        }
        // We create one plot per page
        for (var page of this.valueData.pages) {
            // First, create the chart resulting point
            var inject = document.createElement("div");
            document.getElementById("test-pages").appendChild(inject);
            
            // Create the data table
            var data = new google.visualization.DataTable();
            data.addColumn('string','id');
            // Get axis labels
            for (var axis of page.elements[0].axis) {
                data.addColumn('number',axis.name);
            }
            var rows = []; // Rows is an array of tuples [col1, col2, col3 ... colN];
            for (var element of page.elements) {
                var entry = [element.id];
                for (var i=0; i<page.elements[0].axis.length; i++) {
                    var mean =0;
                    if (i < element.axis.length) {
                        var axis = element.axis[i];
                        for (var value of axis.values) {
                            mean += value;
                        }
                        mean /= axis.values.length;
                    }
                    entry.push(mean);
                }
                rows.push(entry);
            }
            data.addRows(rows);
            var options = {'title':'Mean of page: '+page.id,
                          'width':800,
                          'height':700};
            // Draw the chart
            var chart = new google.visualization.ColumnChart(inject);
            chart.draw(data,options);
        }
    }
}
/*
* Analysis script for WAET
*/

var chartContext;
window.onload = function() {
    // Load the Visualization API and the corechart package.
      google.charts.load('current', {'packages':['corechart']});
    chartContext = new Chart();
}

function arrayMean(values) {
    var mean = 0;
    for (var value of values) {
        mean += value;
    }
    mean /= values.length;
    return mean;
}

function percentile(values, n) {
    values.sort( function(a,b) {return a - b;} );
    // get ordinal rank
    var rank = Math.min(Math.floor(values.length*n/100), values.length-1);
    return values[rank];
}

function arrayMin(array) {
    // Return the minimum value of an array
    var min = array[0];
    for (var value of array) {
        if (value < min) {
            min = value;
        }
    }
    return min;
}

function arrayMax(array) {
    // Return the minimum value of an array
    var max = array[0];
    for (var value of array) {
        if (value > max) {
            max = value;
        }
    }
    return max;
}

function arrayHistogram(values,steps,min,max) {
    if (steps == undefined) {
        steps = 0.25;
        console.log("Warning: arrayHistogram called without steps size set, default to 0.25");
    }
    if (min == undefined) {min = arrayMin(values);}
    if (max == undefined) {max = arrayMax(values);}
    var histogram = [];
    var index = min;
    while(index < max) {
        histogram.push({
            marker: index,
            lt: index,
            rt: index+steps,
            count: 0
        });
        index += steps;
    }
    for (var value of values) {
        for (var entry of histogram) {
            if (value >= entry.lt && value <= entry.rt) {
                entry.count++;
                break;
            }
        }
    }
    return histogram;
}

function Chart() {
    this.valueData = null;
    this.commentData = null;
    this.loadStatus = 0;
    this.charts = [];
    
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
    
    this.chartObject = function(name) {
        // Create the charting object
        this.name = name;
        this.root = document.createElement("div");
        this.root.className = "chart-holder";
        this.root.setAttribute("name",name);
        this.chartDOM = document.createElement("div");
        this.tableDOM = document.createElement("div");
        this.latexDOM = document.createElement("div");
        this.downloadDOM = document.createElement("div");
        this.chart = undefined;
        this.data = new google.visualization.DataTable();
        this.options = {};
        this.print = document.createElement("button");
        this.handleEvent = function() {
            // Only used to handle the chart.event.addListener(this,'ready') callback
            this.downloadDOM.innerHTML = '<a href="' + this.chart.getImageURI() + '">Download</a>';
        }
        
        this.root.appendChild(this.chartDOM);
        this.root.appendChild(this.tableDOM);
        this.root.appendChild(this.latexDOM);
        this.root.appendChild(this.print);
        this.print.textContent = "Download";
        this.print.addEventListener("click",this);
        this.root.appendChild(this.downloadDOM);
        this.buildTable = function() {
            var table = document.createElement("table");
            table.border = "1";
            for (var rowIndex=0; rowIndex<this.data.If.length; rowIndex++) {
                var row = document.createElement("tr");
                table.appendChild(row);
                var rowTitle = document.createElement("td");
                rowTitle.textContent = this.data.If[rowIndex].label;
                row.appendChild(rowTitle);
                for (var cIndex=0; cIndex<this.data.cc.length; cIndex++) {
                    var column = document.createElement("td");
                    column.textContent = this.data.cc[cIndex][rowIndex].tf;
                    row.appendChild(column);
                }
            }
            this.tableDOM.appendChild(table);
        };
        this.writeLatex = function() {
            var root = document.createElement("div");
            root.className = "code";
            var holder = document.createElement("pre");
            // Table start
            var start = document.createElement("p");
            start.textContent = "\\" + "begin{tabular}{|l|";
            holder.appendChild(start);
            for (var i=0; i<this.data.cc.length; i++) {
                start.textContent = start.textContent+"c|";
            }
            // Now write the rows:
            for (var rIndex=0; rIndex<this.data.If.length; rIndex++) {
                var row = document.createElement("p");
                row.textContent = this.data.If[rIndex].label.concat(" & ");
                for (var cIndex=0; cIndex<this.data.cc.length; cIndex++) {
                    row.textContent = row.textContent.concat(this.data.cc[cIndex][rIndex].tf);
                    if (cIndex < this.data.cc.length-1) {
                        row.textContent = row.textContent.concat(" & ");
                    }
                }
                holder.appendChild(row);
            }
            // Table end
            var end = document.createElement("p");
            end.textContent = "\\" + "end{tabular}";
            holder.appendChild(end);
            root.appendChild(holder);
            this.latexDOM.appendChild(root);
        }
    }
    
    this.clear = function() {
        var inject = document.getElementById("test-pages");
        for (var chart of this.charts) {
            inject.removeChild(chart.root);
        }
        this.charts = [];
    }
    
    this.drawTestMean = function() {
        // This draws one bargraph per axis with every test element on
        if (this.valueData == null) {
            console.log("Error - Data not loaded");
            return;
        }
        var chartList = [];
        
        // Create the data table
        for (var page of this.valueData.pages) {
            for (var element of page.elements) {
                for (var axis of element.axis) {
                    // Find the axis
                    var axisChart = chartList.find(function(element,index,array){
                        if (element.name == this) {return true;} else {return false;}
                    },"mean-test-"+axis.id);
                    if (axisChart == null) {
                        axisChart = new this.chartObject("mean-test-"+axis.id);
                        axisChart.options = {
                            'title':'Mean of axis: '+axis.name,
                            'width':window.innerWidth*0.9,
                            'height':(window.innerWidth*0.9)/1.77
                        }
                        axisChart.data.addColumn('string','id');
                        axisChart.data.addColumn('number',axis.name);
                        chartList.push(axisChart);
                        document.getElementById("test-pages").appendChild(axisChart.root);
                    }
                    var mean = arrayMean(axis.values);
                    axisChart.data.addRow([element.id,mean]);
                }
            }
        }
        
        // Build and push charts
        for (var chart of chartList) {
            chart.chart = new google.visualization.ColumnChart(chart.chartDOM);
            chart.chart.draw(chart.data,chart.options);
            chart.buildTable();
            chart.writeLatex();
            this.charts.push(chart);
        }
    }
    
    this.drawPageMean = function() {
        // First we must get the value data
        if (this.valueData == null) {
            console.log("Error - Data not loaded");
            return;
        }
        // We create one plot per page
        for (var page of this.valueData.pages) {
            
            // Create the chart resulting point
            var chart = new this.chartObject("mean-page-"+page.id);
            document.getElementById("test-pages").appendChild(chart.root);
            
            // Create the data table
            chart.data.addColumn('string','id');
            // Get axis labels
            for (var axis of page.elements[0].axis) {
                chart.data.addColumn('number',axis.name);
            }
            var rows = []; // Rows is an array of tuples [col1, col2, col3 ... colN];
            for (var element of page.elements) {
                var entry = [element.id];
                for (var i=0; i<page.elements[0].axis.length; i++) {
                    var mean =0;
                    if (i < element.axis.length) {
                        var axis = element.axis[i];
                        mean = arrayMean(axis.values);
                    }
                    entry.push(mean);
                }
                rows.push(entry);
            }
            chart.data.addRows(rows);
            chart.options = {
                'title':'Mean of page: '+page.id,
                'width':800,
                'height':700
            }
            // Draw the chart
            chart.chart = new google.visualization.ColumnChart(chart.chartDOM);
            chart.chart.draw(chart.data,chart.options);
            chart.buildTable();
            chart.writeLatex();
            this.charts.push(chart);
        }
    }
    
    this.drawElementHistogram = function() {
        // First we must get the value data
        if (this.valueData == null) {
            console.log("Error - Data not loaded");
            return;
        }
        // We create one plot per element, enjoy...
        for (var page of this.valueData.pages) {
            for (var element of page.elements) {
                // Build the chart object
                var chart = new this.chartObject("histogram-element-"+element.id);
                document.getElementById("test-pages").appendChild(chart.root);
                chart.data.addColumn('string','index');
                var histograms = [];
                for (var axis of element.axis) {
                    chart.data.addColumn('number',axis.name);
                    histograms.push(arrayHistogram(axis.values,0.125,0.0,1.0));
                }
                for (var axis of element.axis) {
                    for (var i=0; i<histograms[0].length; i++)
                    {
                        var entry = [""+histograms[0][i].lt.toPrecision(2)+"-"+histograms[0][i].rt.toPrecision(3)]
                        for (var histogram of histograms) {
                            entry.push(histogram[i].count);
                        }
                        chart.data.addRow(entry);
                    }
                }
                chart.options = {
                    'title':'Histogram of element: '+element.id,
                    'width':800,
                    'height':700,
                    'bar':{'groupWidth': '100%'}
                }
                // Draw the chart
                chart.chart = new google.visualization.ColumnChart(chart.chartDOM);
                chart.chart.draw(chart.data,chart.options);
                chart.buildTable();
                chart.writeLatex();
                this.charts.push(chart);
            }
        }
    }
}
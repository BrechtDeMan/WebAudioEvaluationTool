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
        this.sortDataButton = document.createElement("button");
        this.sortDataButton.textContent = "Sort by Data";
        this.sortDataButton.addEventListener("click",this);
        this.sortDataButton.setAttribute("name","sort-data");
        this.sortNameButton = document.createElement("button");
        this.sortNameButton.textContent = "Sort by Name";
        this.sortNameButton.addEventListener("click",this);
        this.sortNameButton.setAttribute("name","sort-name");
        this.draw = function() {
            if (this.chart == undefined) {return;}
            this.tableDOM.innerHTML = null;
            this.latexDOM.innerHTML = null;
            this.buildTable();
            this.writeLatex();
            this.chart.draw(this.data,this.options);
        }
        this.sortData = function() {
            
            var map = this.data.Jf.map(function(el,i){
                return {index: i, value: el.c[1].v};
            });
            
            map.sort(function(a,b){
                if (a.value > b.value) {return -1;}
                if (a.value < b.value) {return 1;}
                return 0;
            })
            
            var Jf = [];
            var cc = [];
            for (var i=0; i<map.length; i++) {
                Jf.push(this.data.Jf[map[i].index]);
                cc.push(this.data.cc[map[i].index]);
            }
            this.data.Jf = Jf;
            this.data.cc = cc;
        }
        this.sortName = function() {
            var map = this.data.Jf.map(function(el,i){
                return {index: i, value: el.c[0].v};
            });
            
            map.sort(function(a,b){
                if (a.value < b.value) {return -1;}
                if (a.value > b.value) {return 1;}
                return 0;
            })
            
            var Jf = [];
            var cc = [];
            for (var i=0; i<map.length; i++) {
                Jf.push(this.data.Jf[map[i].index]);
                cc.push(this.data.cc[map[i].index]);
            }
            this.data.Jf = Jf;
            this.data.cc = cc;
        }
        this.handleEvent = function() {
            // Only used to handle the chart.event.addListener(this,'ready') callback
            switch(event.currentTarget.getAttribute("name"))
            {
                case "download":
                    window.open(this.chart.getImageURI());
                    break;
                case "sort-data":
                    this.sortData();
                    this.draw();
                    break;
                case "sort-name":
                    this.sortName();
                    this.draw();
                    break;
            }
        }
        
        this.root.appendChild(this.chartDOM);
        this.root.appendChild(this.tableDOM);
        this.root.appendChild(this.latexDOM);
        this.root.appendChild(this.sortDataButton);
        this.root.appendChild(this.sortNameButton);
        this.root.appendChild(this.print);
        this.print.textContent = "Download";
        this.print.setAttribute("name","download");
        this.print.addEventListener("click",this);
        this.root.appendChild(this.downloadDOM);
        this.buildTable = function() {
            var table = document.createElement("table");
            table.border = "1";
            var numRows = this.data.getNumberOfRows();
            var numColumns = this.data.getNumberOfColumns();
            for (var columnIndex=0; columnIndex<numColumns; columnIndex++)
            {
                var table_row = document.createElement('tr');
                table.appendChild(table_row);
                var row_title = document.createElement('td');
                table_row.appendChild(row_title);
                row_title.textContent = this.data.getColumnLabel(columnIndex);
                for (var rowIndex=0; rowIndex<numRows; rowIndex++)
                {
                    var row_entry = document.createElement('td');
                    table_row.appendChild(row_entry);
                    var entry = this.data.getValue(rowIndex,columnIndex);
                    if (isFinite(Number(entry)))
                    {
                        entry = String(Number(entry).toFixed(4));
                    }
                    row_entry.textContent = entry;
                }
            }
            this.tableDOM.appendChild(table);
        };
        this.writeLatex = function() {
            var numRows = this.data.getNumberOfRows();
            var numColumns = this.data.getNumberOfColumns();
            var root = document.createElement("div");
            root.className = "code";
            var holder = document.createElement("pre");
            // Table start
            var start = document.createElement("p");
            start.textContent = "\\" + "begin{tabular}{|l|";
            holder.appendChild(start);
            for (var i=0; i<numRows; i++) {
                start.textContent = start.textContent+"c|";
            }
            start.textContent = start.textContent.concat("}");
            // Now write the rows:
            for (var rIndex=0; rIndex<numColumns; rIndex++) {
                var row = document.createElement("p");
                row.textContent = this.data.getColumnLabel(rIndex).concat(" & ");
                for (var cIndex=0; cIndex<numRows; cIndex++) {
                    var entry = this.data.getValue(cIndex,rIndex);
                    if (isFinite(Number(entry)))
                    {
                        entry = String(Number(entry).toFixed(4));
                    }
                    row.textContent = row.textContent.concat(entry);
                    if (cIndex < numRows-1) {
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
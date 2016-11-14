/*
 * Analysis script for WAET
 */

// Firefox does not have an XMLDocument.prototype.getElementsByName
// and there is no searchAll style command, this custom function will
// search all children recusrively for the name. Used for XSD where all
// element nodes must have a name and therefore can pull the schema node
XMLDocument.prototype.getAllElementsByName = function (name) {
    name = String(name);
    var selected = this.documentElement.getAllElementsByName(name);
    return selected;
}

Element.prototype.getAllElementsByName = function (name) {
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while (node != null) {
        if (node.getAttribute('name') == name) {
            selected.push(node);
        }
        if (node.childElementCount > 0) {
            selected = selected.concat(node.getAllElementsByName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
}

XMLDocument.prototype.getAllElementsByTagName = function (name) {
    name = String(name);
    var selected = this.documentElement.getAllElementsByTagName(name);
    return selected;
}

Element.prototype.getAllElementsByTagName = function (name) {
    name = String(name);
    var selected = [];
    var node = this.firstElementChild;
    while (node != null) {
        if (node.nodeName == name) {
            selected.push(node);
        }
        if (node.childElementCount > 0) {
            selected = selected.concat(node.getAllElementsByTagName(name));
        }
        node = node.nextElementSibling;
    }
    return selected;
}

// Firefox does not have an XMLDocument.prototype.getElementsByName
if (typeof XMLDocument.prototype.getElementsByName != "function") {
    XMLDocument.prototype.getElementsByName = function (name) {
        name = String(name);
        var node = this.documentElement.firstElementChild;
        var selected = [];
        while (node != null) {
            if (node.getAttribute('name') == name) {
                selected.push(node);
            }
            node = node.nextElementSibling;
        }
        return selected;
    }
}

var chartContext, testData;
window.onload = function () {
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {
        'packages': ['corechart']
    });
    chartContext = new Chart();
    testData = new Data();
}

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

function arrayMean(values) {
    var mean = 0;
    for (var value of values) {
        mean += value;
    }
    mean /= values.length;
    return mean;
}

function percentile(values, p) {
    //http://web.stanford.edu/class/archive/anthsci/anthsci192/anthsci192.1064/handouts/calculating%20percentiles.pdf
    values.sort(function (a, b) {
        return a - b;
    });
    // get ordinal rank
    var index = values.length * p / 100;
    var k = Math.floor(index);
    if (k == index) {
        return values[k];
    } else {
        var f = index - k;
        var x_int = (1 - f) * values[k] + f * values[k + 1];
        return x_int;
    }
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

function boxplotRow(array) {
    // Take an array of element values and return array of computed intervals
    var result = {
        median: percentile(array, 50),
        pct25: percentile(array, 25),
        pct75: percentile(array, 75),
        IQR: null,
        min: null,
        max: null,
        outliers: new Array()
    }
    result.IQR = result.pct75 - result.pct25;
    var rest = [];
    var pct75_IQR = result.pct75 + 1.5 * result.IQR;
    var pct25_IQR = result.pct25 - 1.5 * result.IQR;
    for (var i = 0; i < array.length; i++) {
        //outliers, ranger above pct75+1.5*IQR or below pct25-1.5*IQR
        var point = array[i];
        if (point > pct75_IQR || point < pct25_IQR) {
            result.outliers.push(point);
        } else {
            rest.push(point);
        }
    }
    result.max = arrayMax(rest);
    result.min = arrayMin(rest);
    return result;

}

function arrayHistogram(values, steps, min, max) {
    if (steps == undefined) {
        steps = 0.25;
        console.log("Warning: arrayHistogram called without steps size set, default to 0.25");
    }
    if (min == undefined) {
        min = arrayMin(values);
    }
    if (max == undefined) {
        max = arrayMax(values);
    }
    var histogram = [];
    var index = min;
    while (index < max) {
        histogram.push({
            marker: index,
            lt: index,
            rt: index + steps,
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
    this.valueData;
    this.charts = [];

    this.chartObject = function (name) {
        // Create the charting object
        this.name = name;
        this.root = document.createElement("div");
        this.root.className = "chart-holder";
        this.root.setAttribute("name", name);
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
        this.sortDataButton.addEventListener("click", this);
        this.sortDataButton.setAttribute("name", "sort-data");
        this.sortNameButton = document.createElement("button");
        this.sortNameButton.textContent = "Sort by Name";
        this.sortNameButton.addEventListener("click", this);
        this.sortNameButton.setAttribute("name", "sort-name");
        this.draw = function () {
            if (this.chart == undefined) {
                return;
            }
            this.tableDOM.innerHTML = null;
            this.latexDOM.innerHTML = null;
            this.buildTable();
            this.writeLatex();
            this.chart.draw(this.data, this.options);
        }
        this.sortData = function () {
            this.data.sort(1);
        }
        this.sortName = function () {
            this.data.sort(0);
        }
        this.handleEvent = function () {
            // Only used to handle the chart.event.addListener(this,'ready') callback
            switch (event.currentTarget.getAttribute("name")) {
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
        this.print.setAttribute("name", "download");
        this.print.addEventListener("click", this);
        this.root.appendChild(this.downloadDOM);
        this.buildTable = function () {
            var table = document.createElement("table");
            table.border = "1";
            var numRows = this.data.getNumberOfRows();
            var numColumns = this.data.getNumberOfColumns();
            for (var columnIndex = 0; columnIndex < numColumns; columnIndex++) {
                var tableTitle = this.data.getColumnLabel(columnIndex);
                if (tableTitle != "") {
                    var table_row = document.createElement('tr');
                    table.appendChild(table_row);
                    var row_title = document.createElement('td');
                    table_row.appendChild(row_title);
                    row_title.textContent = tableTitle;
                    for (var rowIndex = 0; rowIndex < numRows; rowIndex++) {
                        var row_entry = document.createElement('td');
                        table_row.appendChild(row_entry);
                        var entry = this.data.getValue(rowIndex, columnIndex);
                        if (isFinite(Number(entry))) {
                            entry = String(Number(entry).toFixed(4));
                        }
                        row_entry.textContent = entry;
                    }
                }
            }
            this.tableDOM.appendChild(table);
        };
        this.writeLatex = function () {
            var numRows = this.data.getNumberOfRows();
            var numColumns = this.data.getNumberOfColumns();
            var root = document.createElement("div");
            root.className = "code";
            var holder = document.createElement("pre");
            // Table start
            var start = document.createElement("p");
            start.textContent = "\\" + "begin{tabular}{|l|";
            holder.appendChild(start);
            for (var i = 0; i < numRows; i++) {
                start.textContent = start.textContent + "c|";
            }
            start.textContent = start.textContent.concat("}");
            // Now write the rows:
            for (var rIndex = 0; rIndex < numColumns; rIndex++) {
                var tableTitle = this.data.getColumnLabel(rIndex);
                if (tableTitle != "") {
                    var row = document.createElement("p");
                    row.textContent = tableTitle.concat(" & ");
                    for (var cIndex = 0; cIndex < numRows; cIndex++) {
                        var entry = this.data.getValue(cIndex, rIndex);
                        if (isFinite(Number(entry))) {
                            entry = String(Number(entry).toFixed(4));
                        }
                        row.textContent = row.textContent.concat(entry);
                        if (cIndex < numRows - 1) {
                            row.textContent = row.textContent.concat(" & ");
                        } else {
                            row.textContent = row.textContent.concat(" \\\\ \\hline");
                        }
                    }
                    holder.appendChild(row);
                }
            }
            // Table end
            var end = document.createElement("p");
            end.textContent = "\\" + "end{tabular}";
            holder.appendChild(end);
            root.appendChild(holder);
            this.latexDOM.appendChild(root);
        }
    }

    this.clear = function () {
        var inject = document.getElementById("test-pages");
        for (var chart of this.charts) {
            inject.removeChild(chart.root);
        }
        this.charts = [];
    }

    this.drawTestMean = function () {
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
                    var axisChart = chartList.find(function (element, index, array) {
                        if (element.name == this) {
                            return true;
                        } else {
                            return false;
                        }
                    }, "mean-test-" + axis.name);
                    if (axisChart == null) {
                        axisChart = new this.chartObject("mean-test-" + axis.name);
                        axisChart.options = {
                            'title': 'Mean of axis: ' + axis.name,
                            'width': window.innerWidth * 0.9,
                            'height': (window.innerWidth * 0.9) / 1.77
                        }
                        axisChart.data.addColumn('string', 'id');
                        axisChart.data.addColumn('number', axis.name);
                        chartList.push(axisChart);
                        document.getElementById("test-pages").appendChild(axisChart.root);
                    }
                    var mean = arrayMean(axis.values);
                    axisChart.data.addRow([element.id, mean]);
                }
            }
        }

        // Build and push charts
        for (var chart of chartList) {
            chart.chart = new google.visualization.ColumnChart(chart.chartDOM);
            chart.chart.draw(chart.data, chart.options);
            chart.buildTable();
            chart.writeLatex();
            this.charts.push(chart);
        }
    }

    this.drawTestBoxplot = function () {
        if (this.valueData == null) {
            console.log("Error - Data not loaded");
            return;
        }
        var chartList = [];

        // Creates one chart per axis

        // Create the data table
        for (var page of this.valueData.pages) {
            for (var element of page.elements) {
                for (var axis of element.axis) {
                    // Find the axis
                    var axisChart = chartList.find(function (element, index, array) {
                        if (element.name == this) {
                            return true;
                        } else {
                            return false;
                        }
                    }, "boxplot-test-" + axis.name);
                    if (axisChart == null) {
                        // Axis chart doesn't exist
                        axisChart = new this.chartObject("boxplot-test-" + axis.name);
                        axisChart.options = {
                            'title': 'Boxplot of axis ' + axis.name,
                            'width': window.innerWidth * 0.9,
                            'height': (window.innerWidth * 0.9) / 1.77,
                            legend: {
                                position: 'none'
                            },
                            lineWidth: 0,
                            series: [{
                                'color': '#D3362D'
                            }],
                            intervals: {
                                barWidth: 1,
                                boxWidth: 1,
                                lineWidth: 2,
                                style: 'boxes'
                            },
                            interval: {
                                max: {
                                    style: 'bars',
                                    fillOpacity: 1,
                                    color: '#777'
                                },
                                min: {
                                    style: 'bars',
                                    fillOpacity: 1,
                                    color: '#777'
                                }
                            }
                        };
                        axisChart.data.addColumn('string', 'id');
                        axisChart.data.addColumn('number', 'median');
                        axisChart.data.addColumn({
                            id: 'max',
                            type: 'number',
                            role: 'interval'
                        });
                        axisChart.data.addColumn({
                            id: 'min',
                            type: 'number',
                            role: 'interval'
                        });
                        axisChart.data.addColumn({
                            id: 'firstQuartile',
                            type: 'number',
                            role: 'interval'
                        });
                        axisChart.data.addColumn({
                            id: 'median',
                            type: 'number',
                            role: 'interval'
                        });
                        axisChart.data.addColumn({
                            id: 'thirdQuartile',
                            type: 'number',
                            role: 'interval'
                        });
                        chartList.push(axisChart);
                        document.getElementById("test-pages").appendChild(axisChart.root);
                    }
                    var result = boxplotRow(axis.values);
                    axisChart.data.addRow([element.id, result.median, result.max, result.min, result.pct25, result.median, result.pct75]);
                }
            }
        }
        // Build and push charts
        for (var chart of chartList) {
            chart.chart = new google.visualization.LineChart(chart.chartDOM);
            chart.chart.draw(chart.data, chart.options);
            chart.buildTable();
            chart.writeLatex();
            this.charts.push(chart);
        }
    }

    this.drawPageMean = function () {
        // First we must get the value data
        if (this.valueData == null) {
            console.log("Error - Data not loaded");
            return;
        }
        // We create one plot per page
        for (var page of this.valueData.pages) {

            // Create the chart resulting point
            var chart = new this.chartObject("mean-page-" + page.id);
            document.getElementById("test-pages").appendChild(chart.root);

            // Create the data table
            chart.data.addColumn('string', 'id');
            // Get axis labels
            for (var axis of page.elements[0].axis) {
                chart.data.addColumn('number', axis.name);
            }
            var rows = []; // Rows is an array of tuples [col1, col2, col3 ... colN];
            for (var element of page.elements) {
                var entry = [element.id];
                for (var i = 0; i < page.elements[0].axis.length; i++) {
                    var mean = 0;
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
                    'title': 'Mean of page: ' + page.id,
                    'width': 800,
                    'height': 700
                }
                // Draw the chart
            chart.chart = new google.visualization.ColumnChart(chart.chartDOM);
            chart.chart.draw(chart.data, chart.options);
            chart.buildTable();
            chart.writeLatex();
            this.charts.push(chart);
        }
    }

    this.drawElementHistogram = function () {
        // First we must get the value data
        if (this.valueData == null) {
            console.log("Error - Data not loaded");
            return;
        }
        // We create one plot per element, enjoy...
        for (var page of this.valueData.pages) {
            for (var element of page.elements) {
                // Build the chart object
                var chart = new this.chartObject("histogram-element-" + element.id);
                document.getElementById("test-pages").appendChild(chart.root);
                chart.data.addColumn('string', 'index');
                var histograms = [];
                for (var axis of element.axis) {
                    chart.data.addColumn('number', axis.name);
                    histograms.push(arrayHistogram(axis.values, 0.125, 0.0, 1.0));
                }
                for (var axis of element.axis) {
                    for (var i = 0; i < histograms[0].length; i++) {
                        var entry = ["" + histograms[0][i].lt.toPrecision(2) + "-" + histograms[0][i].rt.toPrecision(3)]
                        for (var histogram of histograms) {
                            entry.push(histogram[i].count);
                        }
                        chart.data.addRow(entry);
                    }
                }
                chart.options = {
                        'title': 'Histogram of element: ' + element.id,
                        'width': 800,
                        'height': 700,
                        'bar': {
                            'groupWidth': '100%'
                        }
                    }
                    // Draw the chart
                chart.chart = new google.visualization.ColumnChart(chart.chartDOM);
                chart.chart.draw(chart.data, chart.options);
                chart.buildTable();
                chart.writeLatex();
                this.charts.push(chart);
            }
        }
    }
}

function Data() {
    // This holds the link between the server side calculations and the client side visualisation of the data

    // Dynamically generate the test filtering / page filterting tools
    var self = this;
    // Collect the test types and counts
    this.testSavedDiv = document.getElementById("test-saved");
    this.testSaves = null;
    this.selectURL = null;

    this.specification = new Specification();
    get("../xml/test-schema.xsd").then(function (response) {
        var parse = new DOMParser();
        self.specification.schema = parse.parseFromString(response, 'text/xml');
    }, function (error) {
        console.log("ERROR: Could not get Test Schema");
    });
    this.update = function (url) {
        var self = this;
    }

    this.updateData = function (req_str) {
        // Now go get that data
        get(req_str).then(function (response) {
            // Returns the data
            chartContext.valueData = JSON.parse(response);
        }, function (error) {
            console.error(error);
        });
    }
}

var interfaceContext = new function () {
    // This creates the interface for the user to connect with the dynamic back-end to retrieve data
    this.rootDOM = document.createElement("div");
    this.getDataButton = {
        button: document.createElement("button"),
        parent: this,
        handleEvent: function (event) {
            // Get the list of files:
            var req_str = "../php/get_filtered_score.php" + this.parent.getFilterString();
            testData.updateData(req_str);
        }
    }
    this.getDataButton.button.textContent = "Get Filtered Data";
    this.getDataButton.button.addEventListener("click", this.getDataButton);

    this.getRawScoreData = {
        root: document.createElement("div"),
        csvDOM: document.createElement("button"),
        jsonDOM: document.createElement("button"),
        xmlDOM: document.createElement("button"),
        presentDOM: document.createElement("div"),
        parent: this,
        XHR: new XMLHttpRequest(),
        handleEvent: function (event) {
            this.presentDOM.innerHTML = null;
            var url = "../php/get_filtered_score.php" + this.parent.getFilterString();
            this.XHR.open("GET", url + "&format=" + event.currentTarget.textContent, true);
            switch (event.currentTarget.textContent) {
                case "CSV":
                    this.XHR.onload = function () {
                        var file = [this.response];
                        var bb = new Blob(file, {
                            type: 'text/csv'
                        });
                        this.parent.presentDOM.appendChild(this.parent.generateLink(bb, "scores.csv"));
                    }
                    break;
                case "JSON":
                    this.XHR.onload = function () {
                        var file = [this.response];
                        var bb = new Blob(file, {
                            type: 'application/json'
                        });
                        this.parent.presentDOM.appendChild(this.parent.generateLink(bb, "scores.json"));
                    }
                    break;
                case "XML":
                    this.XHR.onload = function () {
                        var file = [this.response];
                        var bb = new Blob(file, {
                            type: 'text/xml'
                        });
                        this.parent.presentDOM.appendChild(this.parent.generateLink(bb, "scores.xml"));
                    }
                    break;
            }
            this.XHR.send();
        },
        generateLink: function (blob, filename) {
            var dnlk = window.URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.hidden = '';
            a.href = dnlk;
            a.download = filename;
            a.textContent = "Save File";
            return a;
        }
    }

    this.getRawScoreData.root.appendChild(this.getRawScoreData.csvDOM);
    this.getRawScoreData.root.appendChild(this.getRawScoreData.jsonDOM);
    this.getRawScoreData.root.appendChild(this.getRawScoreData.xmlDOM);
    this.getRawScoreData.root.appendChild(this.getRawScoreData.presentDOM);
    this.getRawScoreData.XHR.parent = this.getRawScoreData;
    this.getRawScoreData.csvDOM.textContent = 'CSV';
    this.getRawScoreData.csvDOM.addEventListener('click', this.getRawScoreData);
    this.getRawScoreData.jsonDOM.textContent = 'JSON';
    this.getRawScoreData.jsonDOM.addEventListener('click', this.getRawScoreData);
    this.getRawScoreData.xmlDOM.textContent = 'XML';
    this.getRawScoreData.xmlDOM.addEventListener('click', this.getRawScoreData);

    this.testSaves = {
        json: null,
        selectedURL: null,
        inputs: [],
        parent: this
    };
    this.init = function () {
        var self = this;
        get('../php/get_tests.php?format=JSON').then(function (response) {
            document.getElementById("test-saved").innerHTML = null;
            var table = document.createElement("table");
            table.innerHTML = "<tr><td>Test Filename</td><td>Count</td><td>Include</td></tr>";
            self.testSaves.json = JSON.parse(response);
            for (var test of self.testSaves.json.tests) {
                var tableRow = document.createElement("tr");
                var tableRowFilename = document.createElement("td");
                tableRowFilename.textContent = test.testName;
                var tableRowCount = document.createElement("td");
                tableRowCount.textContent = test.files.length;
                tableRow.appendChild(tableRowFilename);
                tableRow.appendChild(tableRowCount);
                var tableRowInclude = document.createElement("td");
                var obj = {
                    root: document.createElement("input"),
                    parent: self.testSaves,
                    handleEvent: function (event) {
                        this.parent.selectedURL = event.currentTarget.getAttribute("source");
                        var self = this;
                        get(this.parent.selectedURL).then(function (response) {
                            var parse = new DOMParser();
                            testData.specification.decode(parse.parseFromString(response, 'text/xml'));
                            self.parent.parent.generateFilters(testData.specification);
                            self.parent.parent.getFileCount();
                            return true;
                        }, function (error) {
                            console.log("ERROR: Could not get" + url);
                            return false;
                        });
                    }
                }
                obj.root.type = "radio";
                obj.root.name = "test-include";
                obj.root.setAttribute("source", test.testName);
                obj.root.addEventListener("change", obj);
                tableRowInclude.appendChild(obj.root);
                tableRow.appendChild(tableRowInclude);
                table.appendChild(tableRow);
                self.testSaves.inputs.push(obj);
            }
            document.getElementById("test-saved").appendChild(table);
        }, function (error) {
            console.error(error);
        });
    }

    this.filterDOM = document.createElement("div");
    this.filterDOM.innerHTML = "<p>PreTest Filters</p><div id='filter-count'></div>";
    this.filterObjects = [];
    this.generateFilters = function (specification) {
        // Filters are based on the pre and post global surverys
        var FilterObject = function (parent, specification) {
            this.parent = parent;
            this.specification = specification;
            this.rootDOM = document.createElement("div");
            this.rootDOM.innerHTML = "<span>ID: " + specification.id + ", Type: " + specification.type + "</span>";
            this.rootDOM.className = "filter-entry";
            this.handleEvent = function (event) {
                switch (this.specification.type) {
                    case "number":
                        var name = event.currentTarget.name;
                        eval("this." + name + " = event.currentTarget.value");
                        break;
                    case "checkbox":
                        break;
                    case "radio":
                        break;
                }
                this.parent.getFileCount();
            }
            this.getFilterPairs = function () {
                var pairs = [];
                switch (this.specification.type) {
                    case "number":
                        if (this.min != "") {
                            pairs.push([specification.id + "-min", this.min]);
                        }
                        if (this.max != "") {
                            pairs.push([specification.id + "-max", this.max]);
                        }
                        break;
                    case "radio":
                    case "checkbox":
                        for (var i = 0; i < this.options.length; i++) {
                            if (!this.options[i].checked) {
                                pairs.push([specification.id + "-exclude-" + i, specification.options[i].name]);
                            }
                        }
                        break;
                }
                return pairs;
            }
            switch (specification.type) {
                case "number":
                    // Number can be ranged by min/max levels
                    this.min = "";
                    this.max = "";
                    this.minDOM = document.createElement("input");
                    this.minDOM.type = "number";
                    this.minDOM.name = "min";
                    this.minDOM.addEventListener("change", this);
                    this.minDOMText = document.createElement("span");
                    this.minDOMText.textContent = "Minimum: ";
                    var pairHolder = document.createElement("div");
                    pairHolder.appendChild(this.minDOMText);
                    pairHolder.appendChild(this.minDOM);
                    this.rootDOM.appendChild(pairHolder);

                    this.maxDOM = document.createElement("input");
                    this.maxDOM.type = "number";
                    this.maxDOM.name = "max";
                    this.maxDOM.addEventListener("change", this);
                    this.maxDOMText = document.createElement("span");
                    this.maxDOMText.textContent = "Maximum: ";
                    var pairHolder = document.createElement("div");
                    pairHolder.appendChild(this.maxDOMText);
                    pairHolder.appendChild(this.maxDOM);
                    this.rootDOM.appendChild(pairHolder);
                    break;
                case "radio":
                case "checkbox":
                    this.options = [];
                    for (var i = 0; i < specification.options.length; i++) {
                        var option = specification.options[i];
                        var pairHolder = document.createElement("div");
                        var text = document.createElement("span");
                        text.textContent = option.text;
                        var check = document.createElement("input");
                        check.type = "checkbox";
                        check.setAttribute("option-index", i);
                        check.checked = true;
                        check.addEventListener("click", this);
                        this.options.push(check);
                        pairHolder.appendChild(text);
                        pairHolder.appendChild(check);
                        this.rootDOM.appendChild(pairHolder);
                    }
                    break;
                default:
                    break;
            }
        }
        var options = [];
        if (specification.preTest) {
            options = options.concat(specification.preTest.options);
        }
        if (specification.postTest) {
            options = options.concat(specification.postTest.options);
        }
        for (var survey_entry of options) {
            switch (survey_entry.type) {
                case "number":
                case "radio":
                case "checkbox":
                    var node = new FilterObject(this, survey_entry);
                    this.filterObjects.push(node);
                    this.filterDOM.appendChild(node.rootDOM);
                    break;
                default:
                    break;
            }
        }
        document.getElementById("test-saved").appendChild(this.filterDOM);
        document.getElementById("test-saved").appendChild(this.getDataButton.button);
        document.getElementById("test-saved").appendChild(this.getRawScoreData.root);
    }
    this.getFilterString = function () {
        var pairs = [];
        for (var obj of this.filterObjects) {
            pairs = pairs.concat(obj.getFilterPairs());
        }
        var req_str = "?url=" + this.testSaves.selectedURL;
        var index = 0;
        while (pairs[index] != undefined) {
            req_str += '&';
            req_str += pairs[index][0] + "=" + pairs[index][1];
            index++;
        }
        return req_str;
    }
    this.getFilteredUrlArray = function () {
        var req_str = "../php/get_filtered_count.php" + this.getFilterString();
        return get(req_str).then(function (response) {
            var urls = JSON.parse(response);
            return urls.urls;
        }, function (error) {
            console.error(error);
        });
    }
    this.getFileCount = function () {
        // First we must get the filter pairs
        this.getFilteredUrlArray().then(function (response) {
            var str = "Filtered to " + response.length + " file";
            if (response.length != 1) {
                str += "s.";
            } else {
                str += ".";
            }
            document.getElementById("filter-count").textContent = str;
        }, function (error) {});
    }

    this.init();
}

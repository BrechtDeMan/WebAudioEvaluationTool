// Script to load the relevant JS files if the system supports it
/*globals window, document */
var AngularWAET = angular.module('WAET', []);
AngularWAET.controller('test-functionality', ['$scope', '$window', function($s, $w) {
    function parseWindowSearch(queries)
    {
        if (window.location.search.length > 0) {
            var search = window.location.search.split('?')[1];
            // Now split the requests into pairs
            var searchQueries = search.split('&');
            searchQueries = searchQueries.map(function(entry) {
                entry = entry.split('=');
                var key = entry[0];
                var value = decodeURIComponent(entry[1]);
                var obj = {
                    key: key,
                    value: value
                };
                return obj;
            });
            if (Array.isArray(queries) && queries.length > 0) {
                searchQueries = searchQueries.filter(function(entry) {
                    return queries.includes(entry.key);
                });
            }
            return searchQueries.reduce(function(obj, entry) {
                obj[entry.key] = entry.value;
                return obj;
            }, {})
        } else {
            return {};
        }
    }
    if (window.AudioContext === undefined && window.webkitAudioContext === undefined) {
        $s.testPasses = false;
    } else {
        $s.testPasses = true;
    }

    $s.proceedToTest = function() {
        var terms = parseWindowSearch();
        var navUrl = "test.html?"
        if (terms.url) {
            navUrl = navUrl.concat("url=").concat(encodeURI(terms.url));
        }
        if (terms.returnURL) {
            navUrl = navUrl.concat("returnURL=").concat(encodeURI(terms.returnURL));
        }
        if (terms.testKey) {
            navUrl = navUrl.concat("testKey=").concat(encodeURI(terms.testKey));
        }
        if (terms.saveFilenamePrefix) {
            navUrl = navUrl.concat("saveFilenamePrefix=").concat(encodeURI(terms.saveFilenamePrefix));
        }
        window.location.href = navUrl;
    }
}]);

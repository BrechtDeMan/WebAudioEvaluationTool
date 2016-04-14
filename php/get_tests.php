<?php
/*
    Get Tests
    
    This script returns the XML test names available, plus the number of tests
*/

//http://stackoverflow.com/questions/4444475/transfrom-relative-path-into-absolute-url-using-php
function rel2abs($rel, $base)
{
    /* return if already absolute URL */
    if (parse_url($rel, PHP_URL_SCHEME) != '' || substr($rel, 0, 2) == '//') return $rel;

    /* queries and anchors */
    if ($rel[0]=='#' || $rel[0]=='?') return $base.$rel;

    /* parse base URL and convert to local variables:
     $scheme, $host, $path */
    extract(parse_url($base));

    /* remove non-directory element from path */
    $path = preg_replace('#/[^/]*$#', '', $path);

    /* destroy path if relative url points to root */
    if ($rel[0] == '/') $path = '';

    /* dirty absolute URL */
    $abs = "$host$path/$rel";

    /* replace '//' or '/./' or '/foo/../' with '/' */
    $re = array('#(/\.?/)#', '#/(?!\.\.)[^/]+/\.\./#');
    for($n=1; $n>0; $abs=preg_replace($re, '/', $abs, -1, $n)) {}

    /* absolute URL is ready! */
    return $scheme.'://'.$abs;
}

// XML Saves location - assumes it will be saves/
$data = [];
$saves = glob("../saves/*.xml");
if (is_array($saves))
{
    foreach($saves as $filename) {
        $xml_string = file_get_contents($filename, FILE_TEXT);
        $xml_object = simplexml_load_string($xml_string);
        if ($xml_object) {
            $filename = rel2abs($filename,"http://".$_SERVER['SERVER_NAME'] . $_SERVER['REQUEST_URI']);
            $waet = $xml_object->waet[0];
            $testName = urldecode($waet["url"]);
            if(array_key_exists($testName,$data)) {
                // Key exists
                array_push($data[$testName],$filename);
            } else {
                // Key does not exist
                $data[$testName] = [$filename];
            }
        }
    }
}

// Now read the format response
$format = "JSON";
if (array_key_exists("format",$_GET)) {
    $format = $_GET["format"];
}
switch($format) {
    case "JSON":
        // Return JSON
        $doc_root = '{"tests": [';
        $keys = array_keys($data);
        $numTests = count($data);
        for ($testIndex = 0; $testIndex < $numTests; $testIndex++) {
            $test_root = '{"testName": "'.$keys[$testIndex].'", "files": [';
            $numFiles = count($data[$keys[$testIndex]]);
            for ($countIndex=0; $countIndex < $numFiles; $countIndex++) {
                $test_root = $test_root.'"'.$data[$keys[$testIndex]][$countIndex].'"';
                if ($countIndex == $numFiles-1) {
                    $test_root = $test_root.']}';
                } else {
                    $test_root = $test_root.',';
                }
            }
            $doc_root = $doc_root.$test_root;
            if ($testIndex == $numTests-1) {
                $doc_root = $doc_root.']}';
            } else {
                $doc_root = $doc_root.',';
            }
        }
        echo $doc_root;
        break;
    default:
        echo '{"error": "format can only be JSON"}';
}

?>
<?php
include_once("config.php");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
/*
    Get Tests
    
    This script returns the XML test names available, plus the number of tests
*/

include "rel2abs.php";

// XML Saves location - assumes it will be saves/
$data = array();
$saveLocation = getSaveLocation();
$saves = glob($saveLocation."*.xml");
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
                $data[$testName] = array($filename);
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

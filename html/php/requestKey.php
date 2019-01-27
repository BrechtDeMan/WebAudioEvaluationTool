<?php
include_once("config.php");
function generateRandomString($length = 32) {
    // from http://stackoverflow.com/questions/4356289/php-random-string-generator
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

if (!file_exists("../saves")) {
    mkdir("../saves");
}

// Request a new session key from the server
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Get the current test URL
// Load up the parameters
$saveFilenamePrefix = '';
if (isset($_GET['saveFilenamePrefix'])) {
    $saveFilenamePrefix = $_GET['saveFilenamePrefix'].'-';
} else {
    $saveFilenamePrefix = "save-";
}
$testURL = "";
if (isset($_GET['url'])) {
    $testURL = "../".$_GET["url"];
}

$saves = glob("../saves/*.xml");

$key = "";

while ($key == "") {
    $tempKey = generateRandomString(32);
    $unique = true;
    foreach($saves as $filename)
    {
        $xml_string = file_get_contents($filename, FILE_TEXT);
        $xml_object = simplexml_load_string($xml_string);
        if ($xml_object != false) {
            if (isset($value['key']))
            {
                if ($value['key'] == $key_requested) {
                    $unique = false;
                }
            }
        }
    }
    if ($unique) {
        $key = $tempKey;
    }
}
$saveLocation = getSaveLocation();
$filename = $saveLocation.$saveFilenamePrefix.$key.".xml";
$fileHandle = fopen($filename, 'w');
if ($fileHandle == FALSE) {
    die("<response><state>ERROR</state><key>".$key."</key><message>Could not open file for writing</message></response>");
}
fclose($fileHandle);
// TODO:
//  Generate the XML Base file and save it
$doc_struct = new DOMDocument;
$doc_struct->preserveWhiteSpace = false;
$doc_struct->formatOutput = true;
$doc_struct->loadXML("<waetresult />");
$doc_struct->documentElement->setAttribute("key", $key);
// Add the root
if (file_exists($testURL)) {
    $test_proto_doc = new DOMDocument;
    $test_proto_doc->loadXML(file_get_contents($testURL, FILE_TEXT));
    $test_proto = $test_proto_doc->documentElement;
    $test_proto = $doc_struct->importNode($test_proto, true);
    $doc_struct->documentElement->appendChild($test_proto);
}
//  Add start time
//  Add IP Address information
//  Save the file
$doc_struct->save($filename);
echo "<response><state>OK</state><key>".$key."</key></response>";
?>

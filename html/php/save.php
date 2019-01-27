<?php
include_once("config.php");
function findNodeByAttribute($nodeList, $attributeName, $attributeValue) {
    if (empty($attributeName) || empty($attributeValue)) {
        die("Error: Empty findNodeByAttribute");
    }
    if (empty($nodeList)) {
        return 0;
    }
    foreach($nodeList as $item) {
        if ($item->hasAttribute($attributeName)) {
            if ($item->getAttribute($attributeValue) == $attributeValue) {
                return $item;
            }
        }
    }
    return 0;
}

// Set the response headers
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header('Access-Control-Allow-Origin: *');
header("Content-type: text/xml");
//error_reporting(0);

// Load up the parameters
$saveFilenamePrefix = '';
if (isset($_GET['saveFilenamePrefix'])) {
    $saveFilenamePrefix = $_GET['saveFilenamePrefix'].'-';
} else {
    $saveFilenamePrefix = "save-";
}
$postText = file_get_contents('php://input');
$file_key = $_GET['key'];

$update = false;
if (isset($_GET["update"])) {
    $update = $_GET["update"] == "update";
}

$saveLocation = getSaveLocation();

if ($update) {
    $filename = $saveLocation.'update-'.$saveFilenamePrefix.$file_key.".xml";
} else {
    $filename = $saveLocation.$saveFilenamePrefix.$file_key.".xml";
}

if (!file_exists($filename)) {
    die('<response state="error"><message>Could not find save</message></response>');
}

// Open the save
$saved_doc = new DOMDocument;
$saved_doc->preserveWhiteSpace = false;
$saved_doc->formatOutput = true;
$saved_doc->loadXML(file_get_contents($filename, FILE_TEXT));
$saved_root = $saved_doc->documentElement;

// Construct the XML document into a new tree
$doc = new DOMDocument;
$doc->loadXML($postText);
$docRoot = $doc->documentElement;

// Add the relavent nodes:
// <datetime>
$n1 = $docRoot->getElementsByTagName("datetime");
$n2 = $saved_root->getElementsByTagName("datetime");
if ($n1->length > 0 && $n2->length == 0) {
    $n1 = $doc->importNode($n1->item(0), true);
    $docRoot->appendChild($n1);
}

//<navigator>
$n1 = $docRoot->getElementsByTagName("navigator");
$n2 = $saved_root->getElementsByTagName("navigator");
if ($n1->length > 0 && $n2->length == 0) {
    $n1 = $doc->importNode($n1->item(0), true);
    $docRoot->appendChild($n1);
}

//<survey location="pre">
$n1 = $docRoot->getElementsByTagName("survey");
$n2 = $saved_root->getElementsByTagName("survey");
if ($n1->length > 0) {
    // Check if in save
    if ($n2->length == 0) {
        $n2 = 0;
    }
    $sn1 = findNodeByAttribute($n1, "location", "pre");
    $sn2 = findNodeByAttribute($n2, "location", "pre");
    if ($sn1 != 0) {
        if ($sn2 != 0) {
            $saved_root->removeChild($sn2);
            $sn2 = 0;
        }
        if ($sn2 == 0) {
            $sn1 = $doc->importNode($sn1->item(0), true);
            $docRoot->appendChild($sn1);
        }
    }
    
    $sn1 = findNodeByAttribute($n1, "location", "post");
    $sn2 = findNodeByAttribute($n2, "location", "post");
    if ($sn1 != 0) {
        if ($sn2 != 0) {
            $saved_root->removeChild($sn2);
            $sn2 = 0;
        }
        if ($sn2 == 0) {
            $sn1 = $doc->importNode($sn1->item(0), true);
            $docRoot->appendChild($sn1);
        }
    }
}

//<page ref="">
$n1 = $docRoot->getElementsByTagName("page");
$n2 = $saved_root->getElementsByTagName("page");
if ($n1->length > 0) {
    if ($n2->length == 0) {
        $n2 = 0;
    }
    foreach($n1 as $page) {
        $ref = $page->getAttribute("ref");
        if (!empty($ref)) {
            $pn2 = findNodeByAttribute($n2, "ref", $ref);
            if ($pn2 != 0) {
                $saved_root->removeChild($pn2);
                $pn2 = 0;
            }
            if ($pn2 == 0) {
                $pn1 = $doc->importNode($page, true);
                $docRoot->appendChild($pn1);
            }
        }
    }
}

// Iterate through new doc
$wbytes = $doc->save($filename);

// Return XML confirmation data
$xml = '<response state="OK"><message>OK</message><file bytes="'.$wbytes.'">"'.$filename.'"</file></response>';
echo $xml;

if (!$update) {
    unlink($saveLocation.'update-'.$saveFilenamePrefix.$file_key.".xml");
}
?>

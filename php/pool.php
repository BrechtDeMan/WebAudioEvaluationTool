<?php
include_once("config.php");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
// This works out the pool of pages to force the browser to use from the master pool set by 'modifying' the XML file
//

// This scripts lists all participated pages and ranks them by lowest occurence first
// The script then removes from the list any pages which have been completed more times than the lowest occuring test page
// If the number of pages left is less than the number of pages requested from the poolSize, then those that were
// selected will have the alwaysInclude attribute set to true to ensure the next iteration will be selected. Then the next
// least occuring pages are re-added. This continues until number of testPages >= poolSize.

// The reference will always point to the original master XML file.

include 'rel2abs.php';

// MODIFY THE FOLLOWING LINE TO POINT TO YOUR TEST FILE
$master_file = "../tests/pool.xml";
// Note this is relative to the PHP location

// First set up the store with all the test page key nodes
$pages = array();
$master_xml = simplexml_load_string(file_get_contents($master_file, FILE_TEXT));
if ($master_xml) {
    if (!isset($master_xml->setup["poolSize"]))
    {
        echo file_get_contents($master_file, FILE_TEXT);
        return;
    }
    $poolSize = $master_xml->setup["poolSize"];
    foreach($master_xml->page as $pageInstance) {
        $id = (string)$pageInstance['id'];
        $pages[$id] = 0;
    }
}

$waet_url = rel2abs("pool.php","http://".$_SERVER['SERVER_NAME'] . $_SERVER['REQUEST_URI']);

$saveLocation = getSaveLocation();
$saves = glob($saveLocation."*.xml");
if (is_array($saves))
{
    foreach($saves as $filename) {
        $xml_object = simplexml_load_string(file_get_contents($filename, FILE_TEXT));
        if($xml_object) {
            // First we must check the saves match the master URL
            $waet = $xml_object->waet[0];
            if (urldecode($waet["url"])==$waet_url) {
                // This save is a save from the master XML
                // Count which pages have been added
                foreach($xml_object->page as $page) {
                    $id = (string)$page['ref'];
                    $pages[$id] = $pages[$id] + 1;
                }
            }
        }
    }
}

// Now we have a list of pages, sorted from low to high
// Create the new prototype tree
$orig_doc = new DOMDocument;
$orig_doc->loadXML(file_get_contents($master_file, FILE_TEXT));
$orig_doc->schemaValidate("../xml/test-schema.xsd");
$new_doc = new DOMDocument;
$new_doc->formatOutput = true;
//<waet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="test-schema.xsd">
$root = $new_doc->createElement('waet');
$root->setAttribute("xmlns:xsi","http://www.w3.org/2001/XMLSchema-instance");
$root->setAttribute("xsi:noNamespaceSchemaLocation","test-schema.xsd");
$root = $new_doc->appendChild($root);

// Copy over the <setup> node
$dom_setup = $new_doc->importNode(dom_import_simplexml($master_xml->setup),true);
$root->appendChild($dom_setup);

// We must now extract the number which have been performed the least
$rot_pages = array();
foreach($pages as $key => $var)
    if(array_key_exists($var,$rot_pages)) {
        array_push($rot_pages[$var],$key);
    } else {
        $rot_pages[$var] = array($key);
    }
ksort($rot_pages);
$Keys = array_keys($rot_pages);

// Pages are grouped into an array based on the number of page initiations ($rot_pages)
// $Keys is an array of the sorted key maps
$pageList = $new_doc->getElementsByTagName("page");
$iter = 0;
while ($pageList->length < $poolSize) {
    if ($iter > 0) {
        // We are adding more than one set of pages, make all current always include
        foreach($pageList as $page) {
            $page->setAttribute("alwaysInclude","true");
        }
    }
    foreach($rot_pages[$Keys[$iter]] as $pageId) {
        // We have the pages to add as a $pageId
        // Now COPY
        $dom_page = $orig_doc->getElementById($pageId);
        $dom_page = $new_doc->importNode($dom_page,true);
        $root->appendChild($dom_page);
    }
    $iter++;
    $pageList = $new_doc->getElementsByTagName("page");
}

echo $new_doc->saveXML();

?>

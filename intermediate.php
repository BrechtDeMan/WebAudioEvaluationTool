<?php
// This script manages the intermediate saves

//http://stackoverflow.com/questions/4778865/php-simplexml-addchild-with-another-simplexmlelement
function sxml_append(SimpleXMLElement $to, SimpleXMLElement $from) {
    $toDom = dom_import_simplexml($to);
    $fromDom = dom_import_simplexml($from);
    $toDom->appendChild($toDom->ownerDocument->importNode($fromDom, true));
}

$file_key = $_GET['key'];
$nodeName = $_GET['node'];
$id = $_GET['id'];
$filename = "saves/save-".$file_key.".xml";
$save_ok = '<response state="OK"><message>OK</message><file>'.$filename.'</file></response>';
$save_error = '<response state="error"><message>Could not update the file</message><file>'.$filename.'</file></response>';
$node = file_get_contents('php://input');
$inject_xml = simplexml_load_string($node);
$xml_string = file_get_contents($filename, FILE_TEXT);
$xml_object = simplexml_load_string($xml_string);

if ($nodeName == "waetresult") {
    sxml_append($xml_object, $inject_xml);
} else {
    if ($id == "undefined") {
        return;
    } else {
        $result = $xml_object->xpath("".$nodeName."[@id='".$id."']");
        sxml_append($result[0], $inject_xml);
    }
}
$xml_object->asXML($filename)
?>
<?php
include_once("config.php");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
//http://stackoverflow.com/questions/4444475/transfrom-relative-path-into-absolute-url-using-php
include "rel2abs.php";

/*
    This looks for files that pass the filtering response
    The filtering system uses key-value pairs
    The key is double encoded using a '-'. The first part is the ID of the item to filter,
    the second is the method:
        min - Minimum Inclusive
        max - Maximum Inclusive
        exclude-# - exclude, followed by a number to uniquely add, (will create a triple [], ignore the third as random)
*/
$keys = array();
$waet_url = null;
foreach ($_GET as $key => $value) {
    $key = explode("-",$key);
    if ($key[0] == "url") {
        $waet_url = $value;
    } else {
        $v_pair = array($key[1],$value);
        if(array_key_exists($key[0],$keys)) {
            // We have some data
            array_push($keys[$key[0]],$v_pair);
        } else {
            // Create new key data
            $keys[$key[0]] = array($v_pair);
        }
    }
}

$files = array();
$saveLocation = getSaveLocation();
$saves = glob($saveLocation."*.xml");
if (is_array($saves))
{
    foreach($saves as $filename) {
        $xml_string = file_get_contents($filename, FILE_TEXT);
        $xml_object = simplexml_load_string($xml_string);
        if ($xml_object) {
            // First we must check the URLs match
            $waet = $xml_object->waet[0];
            if (urldecode($waet["url"])==$waet_url) {
                // It is part of the dataset, so now perform checks
                $continue = true;
                foreach($keys as $keyId => $keyArr) {
                    $elem = $xml_object->xpath("//*[@ref='".$keyId."']");
                    $elem = $elem[0]; // Can only be one.
                    switch ($elem["type"]) {
                        case "number":
                            // Number, we must check for min/max
                            $value =  (real)$elem->response;
                            foreach ($keyArr as $keyCheck) {
                                if ($keyCheck[0] == 'min' && $value < $keyCheck[1]) {
                                    $continue = false;
                                    break;
                                } else if ($keyCheck[0] == 'max' && $value > $keyCheck[1]) {
                                    $continue = false;
                                    break;
                                }
                            }
                            break;
                        case "checkbox":
                            // Will have an array of <response>
                            foreach ($elem->response as $response) {
                                foreach ($keyArr as $keyCheck) {
                                    if ($response["name"] == $keyCheck[1]) {
                                        if($response["checked"] == "true" && $keyCheck[0] == "exclude") {
                                            $continue = false;
                                            break;
                                        }
                                    }
                                }
                                if($continue == false) {
                                    break;
                                }
                            }
                            break;
                        case "radio":
                            foreach ($keyArr as $keyCheck) {
                                if ($keyCheck[0] == "exclude" && $elem->response["name"] == $keyCheck[1]) {

                                    $continue = false;
                                    break;
                                }
                            }
                            break;
                        default:
                            break;
                    }
                    if ($continue == false) {
                        break;
                    }
                }
                if ($continue) {
                    array_push($files,rel2abs($filename,"http://".$_SERVER['SERVER_NAME'] . $_SERVER['REQUEST_URI']));
                }
            }
        }
    }
}
if (count($files) == 0) {
    echo '{"urls": []}';
} else {
    echo '{"urls": ["'.implode('","',$files).'"]}';
}

?>

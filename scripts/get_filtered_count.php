<?php
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

/*
    This looks for files that pass the filtering response
    The filtering system uses key-value pairs
    The key is double encoded using a '-'. The first part is the ID of the item to filter,
    the second is the method:
        min - Minimum Inclusive
        max - Maximum Inclusive
        exclude-# - exclude, followed by a number to uniquely add, (will create a triple [], ignore the third as random)
*/
$keys = [];
$waet_url = null;
foreach ($_GET as $key => $value) {
    $key = explode("-",$key);
    if ($key[0] == "url") {
        $waet_url = $value;
    } else {
        $v_pair = [$key[1],$value];
        if(array_key_exists($key[0],$keys)) {
            // We have some data
            array_push($keys[$key[0]],$v_pair);
        } else {
            // Create new key data
            $keys[$key[0]] = [$v_pair];
        }
    }
}

$files = [];
$saves = glob("../saves/*.xml");
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
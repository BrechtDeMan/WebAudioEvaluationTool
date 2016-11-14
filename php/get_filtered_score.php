<?php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
class nestedObject {
    function __construct($id) {
        $this->id = $id;
        $this->nest = array();
        $this->type = null;
        $this->num = 0;
    }
    function addNewChild($id) {
        if ($this->type == null) {
            $this->type = "nest";
        }
        if ($this->type == "nest") {
            $obj = new nestedObject($id);
            array_push($this->nest,$obj);
            $this->num = count($this->nest);
            return $this->nest[$this->num-1];
        }
        return null;
    }
    function findChild($checkId) {
        if ($this->type == "nest"){
            foreach($this->nest as $child)
            {
                if (strcmp($checkId,$child->id) == 0) {
                    return $child;
                }
            }
        }
        return null;
    }
    function addValue($val) {
        if ($this->type == null) {
            $this->type = "value";
        }
        if ($this->type == "value") {
            array_push($this->nest,$val);
            $this->num = count($this->nest);
            return $this->nest[$this->num-1];
        }
        return null;
    }
}

$requestFormat = 'JSON';
if (isset($_GET["format"])) {
    $requestFormat = $_GET["format"];
    if ($requestFormat != "CSV" && $requestFormat != "JSON" && $requestFormat != "XML") {
        return "Invalid format parameter in get request. Must be CSV, JSON or XML";
    }
}
$request = "http://".$_SERVER['SERVER_NAME'] . $_SERVER['REQUEST_URI'];
$request = explode("get_filtered_score.php",$request);
$request = implode("get_filtered_count.php",$request);
$json = json_decode(file_get_contents($request),true);
$saves = $json["urls"];
// Now we have the filtered save file URLs

// Build the root nest object to hold the testPages
$root = new nestedObject("root");
foreach($saves as $url) {
    $xml_object = simplexml_load_string(file_get_contents($url));
    if ($xml_object == false) {
        echo "<h1>FATAL</h1> <span>could not parse file ".$url.": </span>";
        foreach(libxml_get_errors() as $error) {
            echo "<br>", $error->message;
        }
    } else {
        foreach($xml_object->page as $pageInstance)
        {
            // Find in the nest
            $pageInstanceId = $pageInstance['ref'];
            $page_nest = $root->findChild($pageInstanceId);
            if ($page_nest == null) {
                $page_nest = $root->addNewChild($pageInstanceId);
            }

            // Iterate over each $element node
            foreach($pageInstance->audioelement as $element) {
                // Find our specific element tag
                $elementId = null;
                if (isset($element['name'])) {
                    $elementId = $element['name'];
                } else {
                    $elementId = $element['ref'];
                }
                $element_nest = $page_nest->findChild($elementId);
                if ($element_nest == null) {
                    $element_nest = $page_nest->addNewChild($elementId);
                }
                // Now get the <value> tags
                foreach($element->value as $value) {
                    $axis_nest = null;
                    $axisName = "default";
                    if (isset($value['interface-name']))
                    {
                        // Find the axis nest
                        $axisName = $value['interface-name'];
                    }

                    $axis_nest = $element_nest->findChild($axisName);
                    if ($axis_nest == null) {
                        $axis_nest = $element_nest->addNewChild($axisName);
                    }
                    // Now push our value
                    $axis_nest->addValue($value);
                }
            }
        }
    }
}
switch($requestFormat) {
    case "JSON":
        $doc_root = '{ "pages": [';
        for ($pageIndex = 0; $pageIndex < $root->num; $pageIndex++)
        {
            $page = $root->nest[$pageIndex];
            $doc_page = '{ "id": "'.$page->id.'", "elements": [';
            for($elementIndex = 0; $elementIndex < $page->num; $elementIndex++)
            {
                $element = $page->nest[$elementIndex];
                $doc_element = '{ "id": "'.$element->id.'", "axis": [';
                for($axisIndex = 0; $axisIndex < $element->num; $axisIndex++)
                {
                    $axis = $element->nest[$axisIndex];
                    $doc_axis = '{ "name": "'.$axis->id.'", "values": [';
                    for ($valueIndex = 0; $valueIndex < $axis->num; $valueIndex++)
                    {
                        $doc_axis = $doc_axis."".strval($axis->nest[$valueIndex]);
                        if ($valueIndex < $axis->num-1) {
                            $doc_axis = $doc_axis.', ';
                        }
                    }
                    $doc_axis = $doc_axis.']}';
                    if ($axisIndex < $element->num-1) {
                        $doc_axis = $doc_axis.', ';
                    }
                    $doc_element = $doc_element.$doc_axis;
                }
                $doc_element = $doc_element.']}';
                if ($elementIndex < $page->num-1) {
                    $doc_element = $doc_element.', ';
                }
                $doc_page = $doc_page.$doc_element;
            }
            $doc_page = $doc_page.']}';
            if ($pageIndex < $root->num-1) {
                $doc_page = $doc_page.', ';
            }
            $doc_root = $doc_root.$doc_page;
        }
        $doc_root = $doc_root.']}';
        echo $doc_root;
        break;
    case "XML":
        $xml_root = new SimpleXMLElement('<waetprocess/>');
        for ($pageIndex=0; $pageIndex < $root->num; $pageIndex++) {
            $page = $root->nest[$pageIndex];
            $xml_page = $xml_root->addChild("page");
            $xml_page->addAttribute("id",$page->id);
            for($elementIndex = 0; $elementIndex < $page->num; $elementIndex++)
            {
                $element = $page->nest[$elementIndex];
                $xml_element = $xml_page->addChild("audioelement");
                $xml_element->addAttribute("id", $element->id);
                for($axisIndex = 0; $axisIndex < $element->num; $axisIndex++)
                {
                    $axis = $element->nest[$axisIndex];
                    $xml_axis = $xml_element->addChild("axis");
                    $xml_axis->addAttribute("name",$axis->id);
                    for ($valueIndex = 0; $valueIndex < $axis->num; $valueIndex++)
                    {
                        $xml_value = $xml_axis->addChild("value",strval($axis->nest[$valueIndex]));
                    }
                }
            }
        }
        echo $xml_root->asXML();
        break;
    case "CSV":
        $doc_string = "page,element,axis,value"."\r\n";
        foreach($root->nest as $page){
            foreach($page->nest as $element) {
                foreach($element->nest as $axis) {
                    foreach($axis->nest as $value) {
                        $doc_string = $doc_string.$page->id.',';
                        $doc_string = $doc_string.$element->id.',';
                        $doc_string = $doc_string.$axis->id.',';
                        $doc_string = $doc_string.$value."\r\n";
                    }
                }
            }
        }
        echo $doc_string;
}
?>

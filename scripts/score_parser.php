<?php
// Value parser for WAET XML
// testPage --> axis --> element --> value
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

// Build the root nest object to hold the testPages
$root = new nestedObject("root");

// XML Saves location - assumes it will be saves/
$saves = glob("../saves/*.xml");
if (is_array($saves))
{
    foreach($saves as $filename) {
        $xml_string = file_get_contents($filename, FILE_TEXT);
        $xml_object = simplexml_load_string($xml_string);
        if ($xml_object == false) {
            echo "<h1>FATAL</h1> <span>could not parse file ".$filename.": </span>";
            foreach(libxml_get_errors() as $error) {
                echo "<br>", $error->message;
            }
        } else {
            // Iterate over each $page node
            foreach($xml_object->page as $pageInstance)
            {
                // Find in the nest
                $pageInstanceId = $pageInstance['id'];
                $page_nest = $root->findChild($pageInstanceId);
                if ($page_nest == null) {
                    $page_nest = $root->addNewChild($pageInstanceId);
                }
                
                // Iterate over each $element node
                foreach($pageInstance->audioelement as $element) {
                    
                    // Now get the <value> tags
                    foreach($element->value as $value) {
                        $axis_nest = null;
                        $axisName = "default";
                        if (isset($value['interface-name']))
                        {
                            // Find the axis nest
                            $axisName = $value['interface-name'];
                        }
                        
                        $axis_nest = $page_nest->findChild($axisName);
                        if ($axis_nest == null) {
                            $axis_nest = $page_nest->addNewChild($axisName);
                        }
                        
                        // Find our specific element tag
                        $elementId = $element['id'];
                        $element_nest = $axis_nest->findChild($elementId);
                        if ($element_nest == null) {
                            $element_nest = $axis_nest->addNewChild($elementId);
                        }
                        // Now push our value
                        $element_nest->addValue($value);
                    }
                }
            }
        }
    }
    // We now have a structure in $root. EXPORT IT
    switch($_GET['format']) {
        case "XML":
            // Convert to XML
            $doc_root = new SimpleXMLElement('<waetprocess/>');
            foreach($root->nest as $page) {
                $doc_page = $doc_root->addChild("page");
                $doc_page->addAttribute("id",$page->id);
                foreach($page->nest as $axis) {
                    $doc_axis = $doc_page->addChild("interface");
                    $doc_axis->addAttribute("name",$axis->id);
                    foreach($axis->nest as $element) {
                        $doc_element = $doc_axis->addChild("audioelement");
                        $doc_element->addAttribute("id",$element->id);
                        foreach($element->nest as $value) {
                            $doc_value = $doc_element->addChild("value",$value);
                        }
                    }
                }
            }
            echo $doc_root->asXML();
            break;
        case "JSON":
            // Convert to JSON
            $doc_root = '{ "pages": [';
            for ($pageIndex = 0; $pageIndex < $root->num; $pageIndex++)
            {
                $page = $root->nest[$pageIndex];
                $doc_page = '{ "id": "'.$page->id.'", "axis": [';
                for($axisIndex = 0; $axisIndex < $page->num; $axisIndex++)
                {
                    $axis = $page->nest[$axisIndex];
                    $doc_axis = '{ "name": "'.$axis->id.'", "elements": [';
                    for($elementIndex = 0; $elementIndex < $axis->num; $elementIndex++)
                    {
                        $element = $axis->nest[$elementIndex];
                        $doc_element = '{ "id": "'.$element->id.'", "values": [';
                        for ($valueIndex = 0; $valueIndex < $element->num; $valueIndex++)
                        {
                            $doc_element = $doc_element."".strval($element->nest[$valueIndex]);
                            if ($valueIndex < $element->num-1) {
                                $doc_element = $doc_element.', ';
                            }
                        }
                        $doc_element = $doc_element.']}';
                        if ($elementIndex < $axis->num-1) {
                            $doc_element = $doc_element.', ';
                        }
                        $doc_axis = $doc_axis.$doc_element;
                    }
                    $doc_axis = $doc_axis.']}';
                    if ($axisIndex < $page->num-1) {
                        $doc_axis = $doc_axis.', ';
                    }
                    $doc_page = $doc_page.$doc_axis;
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
        case "CSV":
            // Convert to CSV
            // CSV Columts: page, axis, element, value
            $doc_string = "page,axis,element,value"."\r\n";
            foreach($root->nest as $page){
                foreach($page->nest as $axis) {
                    foreach($axis->nest as $element) {
                        foreach($element->nest as $value) {
                            $doc_string = $doc_string.$page->id;
                            $doc_string = $doc_string.$axis->id;
                            $doc_string = $doc_string.$element->id;
                            $doc_string = $doc_string.$value;
                            $doc_string = $doc_string."\r\n";
                        }
                    }
                }
            }
            echo $doc_string;
    }
} else {
    echo "FATAL - No saved XML files discovered";
}

?>
<?php
include_once("config.php");
// Comment Parser for PHP
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
class audioElement {
    function __construct($id) {
        $this->id = $id;
        $this->comments = array();
    }
    function addComment($str) {
        array_push($this->comments,$str);
    }
}

class testPage {
    function __construct($id) {
        $this->id = $id;
        $this->elements = array();
    }
}
// XML Saves location - assumes it will be saves/
$saveLocation = getSaveLocation();
$saves = glob($saveLocation."*.xml");
$comment_struct = array();
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
            // Iterate over each audioHolder node
            foreach($xml_object->page as $pageInstance)
            {
                // Find the page in the comment_struct
                $page_struct = null;
                if($pageInstance['state'] == "complete") {
                    foreach($comment_struct as $comment_struct_page)
                    {
                        if ($pageInstance['ref'] == $comment_struct_page->id)
                        {
                            $page_struct = $comment_struct_page;
                            break;
                        }
                    }
                    if ($page_struct == null) {
                        array_push($comment_struct,new testPage($pageInstance['ref']));
                        $page_struct = $comment_struct[count($comment_struct)-1];
                    }
                    // Get the audioelements of the page
                    foreach($pageInstance->audioelement as $fragment)
                    {
                        // Find the page in the comment_struct
                        $element_struct = null;
                        foreach($page_struct->elements as $page_struct_element)
                        {
                            if ($fragment['name'] == $page_struct_element->id)
                            {
                                $element_struct = $page_struct_element;
                                break;
                            }
                        }
                        if ($element_struct == null) {
                            array_push($page_struct->elements,new audioElement($fragment['name']));
                            $element_struct = $page_struct->elements[count($page_struct->elements)-1];
                        }
                        $element_struct->addComment($fragment->comment->response);
                    }
                }
            }
        }
    }
    // Now we have a structure containing all comment data
    switch($_GET['format']) {
        case "XML":
            // Convert to an XML
            $doc_struct = new SimpleXMLElement('<waetprocess/>');
            foreach($comment_struct as $page_struct)
            {
                $doc_page = $doc_struct->addChild("page");
                $doc_page->addAttribute("id",$page_struct->id);
                foreach($page_struct->elements as $element_struct)
                {
                    $doc_element = $doc_page->addChild("audioelement");
                    $doc_element->addAttribute("id",$element_struct->id);
                    foreach($element_struct->comments as $comment)
                    {
                        $doc_comment = $doc_element->addChild("comment",$comment);
                    }
                }
            }
            echo $doc_struct->asXML();
            break;
        case "JSON":
            // Convert to JSON
            $doc_string = '{ "pages": [';
            for($page_index = 0; $page_index < count($comment_struct); $page_index++ )
            {
                $page_struct = $comment_struct[$page_index];
                $doc_page = '{"id": "'.$page_struct->id.'", "elements": [';
                for($element_index = 0; $element_index < count($page_struct->elements); $element_index++ )
                {
                    $element_struct = $page_struct->elements[$element_index];
                    $doc_element = '{"id": "'.$element_struct->id.'", "comments": [';
                    for($comment_index = 0; $comment_index < count($element_struct->comments); $comment_index++ )
                    {
                        $doc_comment = '"'.$element_struct->comments[$comment_index].'"';
                        if ($comment_index < count($element_struct->comments)-1) {
                            $doc_comment = $doc_comment.',';
                        }
                        $doc_element = $doc_element.$doc_comment;
                    }
                    $doc_element = $doc_element.']}';
                    if ($element_index < count($page_struct->elements)-1) {
                        $doc_element = $doc_element.',';
                    }
                    $doc_page = $doc_page.$doc_element;
                }
                $doc_page = $doc_page.']}';
                if ($page_index < count($comment_struct)-1) {
                    $doc_page = $doc_page.',';
                }
                $doc_string = $doc_string.$doc_page;
            }
            $doc_string = $doc_string."]}";
            echo $doc_string;
            break;
        case "CSV":
            // Conver to CSV
            // The CSV has three columns: page, element, comment
            $doc_string = "page,element,comment"."\r\n";
            foreach($comment_struct as $page_struct)
            {
                foreach($page_struct->elements as $element_struct)
                {
                    foreach($element_struct->comments as $comment)
                    {
                        $doc_string = $doc_string.$page_struct->id.",".$element_struct->id.",".$comment."\r\n";
                    }
                }
            }
            echo $doc_string;
    }
} else {
    echo "FATAL - No saved XML files discovered";
}
?>

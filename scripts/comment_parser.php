<?php
// Comment Parser for PHP

// XML Saves location - assumes it will be saves/
$saves = glob("../saves/*.xml");
$comment_struct = new SimpleXMLElement('<waetprocess/>');
if (is_array($saves))
{
    foreach($saves as $filename) {
        $xml_string = file_get_contents($filename, FILE_TEXT);
        $xml_object = simplexml_load_string($xml_string);
        $test_struct = $comment_struct->addChild("test");
        if ($xml_object == false) {
            echo "<h1>FATAL</h1> <span>could not parse file ".$filename.": </span>";
            foreach(libxml_get_errors() as $error) {
                echo "<br>", $error->message;
            }
        } else {
            // Iterate over each audioHolder node
            foreach($xml_object->page as $pageInstance)
            {
                $page_struct = $test_struct->addChild("page");
                // Get the page-id and attach
                $page_struct->addAttribute("page-id",$pageInstance['id']);
                
                // Get the audioelements of the page
                foreach($pageInstance->audioelement as $fragment)
                {
                    $fragment_struct = $page_struct->addChild("audioelement");
                    // Get the element-id and attach
                    $page_struct->addAttribute("element-id",$fragment['id']);
                    $page_struct->addAttribute("presented-id",$fragment['presentedId']);
                    $page_struct->addAttribute("url",$fragment['url']);
                    // Append the comment data
                    echo "<p>Comment: ".$fragement->comment."</p>";
                    $comment = $fragment_struct->addChild("comment");
                }
            }
        }
    }
    // Now we have a sub <xml> containing all comment data
    echo $comment_struct->asXML();
} else {
    echo "FATAL - No saved XML files discovered";
}
?>
<?php
include_once("config.php");
$saveLocation = getSaveLocation();
$file = $saveLocation."test-save.xml";
$state = file_put_contents($file, "<xml></xml>");
if ($state == FALSE) {
    echo "<response state=\"error\"><message>Could not open file</message></response>";
} else {
    unlink($file) or die("<response state=\"error\"><message>Could not open file</message></response>");
    echo "<response state=\"OK\"><message>OK</message></response>";
}
?>

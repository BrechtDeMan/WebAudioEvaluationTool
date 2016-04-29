<?php
	error_reporting(0);
	$saveFilenamePrefix = isset($_GET['saveFilenamePrefix']) ? $_GET['saveFilenamePrefix'].'-' : '';
	header('Access-Control-Allow-Origin: *');
	header("Content-type: text/xml");
	$postText = file_get_contents('php://input');
	$file_key = $_GET['key'];
	$filename = '../saves/'.$saveFilenamePrefix.'save-'.$file_key.".xml";
    $doc = new DOMDocument;
    $doc->preserveWhiteSpace = false;
    $doc->formatOutput = true;
    $doc->loadXML($postText);
    $postText = $doc->saveXML();
	$fileHandle = fopen($filename, 'w');
	if ($fileHandle == FALSE)
	{
		// Filehandle failed
		$xml = '<response state="error"><message>Could not open file</message></response>';
		echo $xml;
		return;
	}
	$wbytes = fwrite($fileHandle, $postText);
	if ($wbytes === FALSE)
	{
		// FileWrite failed
		$xml = '<response state="error"><message>Could not write file "'.$filename.'"</message></response>';
		echo $xml;
		return;
	}
	fclose($fileHandle);
	
	// Return XML confirmation data
	$xml = '<response state="OK"><message>OK</message><file bytes="'.$wbytes.'">"'.$filename.'"</file></response>';
	echo $xml;
?>

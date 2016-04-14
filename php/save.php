<?php
	error_reporting(0);
	header('Access-Control-Allow-Origin: *');
	header("Content-type: text/xml");
	$postText = file_get_contents('php://input');
    $file_key = $_GET['key'];
    $filename = "../saves/save-".$file_key.".xml";
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
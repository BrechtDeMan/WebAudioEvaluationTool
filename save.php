<?php
	error_reporting(0);
    try{
        date_default_timezone_get();
    }
    catch(Exception $e){
        date_default_timezone_set('UTC'); // Sets to UTC if not specified anywhere in .ini
    }
	header('Access-Control-Allow-Origin: *');
	header("Content-type: text/xml");
	$postText = file_get_contents('php://input');
	$sha1_hash = sha1($postText);
	$datetime = date('ymdHis');
	$xmlfile = "save".$datetime."-".$sha1_hash.".xml";
	$fileHandle = fopen("saves/".$xmlfile, 'w');
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
		$xml = '<response state="error"><message>Could not write file "saves/'.$xmlfile.'"</message></response>';
		echo $xml;
		return;
	}
	fclose($fileHandle);
	
	// Return JSON confirmation data
	$xml = '<response state="OK"><message>OK</message><file bytes="'.$wbytes.'">"saves/'.$xmlfile.'"</file></response>';
	echo $xml;
?>

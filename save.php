<?php
	head('Access-Control-Allow-Origin: *');
	$postText = file_get_contents('php://input');
	$datetime = date('ymdHis');
	$xmlfile = "save".$datetime.".xml";
	$fileHandle = fopen("saves/".$xmlfile, 'w');
	fwrite($fileHandle, $postText);
	fclose($fileHandle);
?>
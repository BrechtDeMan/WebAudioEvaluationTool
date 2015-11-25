<?php
	header('Access-Control-Allow-Origin: *');
	header("Content-type: text/xml");
	$postText = file_get_contents('php://input');
	$datetime = date('ymdHis');
	$xmlfile = "save".$datetime."-".generateRandomString(6).".xml";
	$fileHandle = fopen("saves/".$xmlfile, 'w');
	if ($fileHandle == FALSE)
	{
		// Filehandle failed
		$xml = '<response state="error"><message>Could not open file</message></response>';
		echo $xml;
		return;
	}
	$wbytes = fwrite($fileHandle, $postText);
	if ($wbytes == FALSE)
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
	
	// Random String generator from http://stackoverflow.com/questions/4356289/php-random-string-generator
	function generateRandomString($length = 10) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}
?>
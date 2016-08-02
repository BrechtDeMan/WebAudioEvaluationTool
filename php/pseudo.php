<?php
    header('Access-Control-Allow-Origin: *');
	header("Content-type: text/xml");
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    $files = glob('../saves/' . '*.xml');
    $numsaves = 0;
    if ( $files !== false )
    {
        $numsaves = count( $files );
    }

    $files = glob('../tests/' . '*.xml');
    $numtests = 0;
    if ( $numtests !== false )
    {
        $numtests = count( $files );
    }

    $testID = ($numsaves % $numtests);

	readfile($files[$testID]);
?>

<?php
    header('Access-Control-Allow-Origin: *');
	header("Content-type: text/xml");
    $files = glob('../saves/' . '*.xml');
    $numsaves = 0;
    if ( $files !== false )
    {
        $numsaves = count( $files );
    }

    $files = glob('pseudo/' . '*.xml');
    $numtests = 0;
    if ( $numtests !== false )
    {
        $numtests = count( $files );
    }

    $testID = ($numsaves % $numtests)-1;

	readfile($files[$testID]);
?>
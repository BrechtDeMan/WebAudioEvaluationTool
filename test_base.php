<?php
function fisherYatesShuffle(&$items, $seed) // http://stackoverflow.com/questions/6557805/randomize-a-php-array-with-a-seed
{
  @mt_srand($seed);
  for ($i = count($items) - 1; $i > 0; $i--)
  {
    $j = @mt_rand(0, $i);
    $tmp = $items[$i];
    $items[$i] = $items[$j];
    $items[$j] = $tmp;
  }
}
function url_origin( $s, $use_forwarded_host = false ) //http://stackoverflow.com/questions/6768793/get-the-full-url-in-php
{
  $ssl      = ( ! empty( $s['HTTPS'] ) && $s['HTTPS'] == 'on' );
  $sp       = strtolower( $s['SERVER_PROTOCOL'] );
  $protocol = substr( $sp, 0, strpos( $sp, '/' ) ) . ( ( $ssl ) ? 's' : '' );
  $port     = $s['SERVER_PORT'];
  $port     = ( ( ! $ssl && $port=='80' ) || ( $ssl && $port=='443' ) ) ? '' : ':'.$port;
  $host     = ( $use_forwarded_host && isset( $s['HTTP_X_FORWARDED_HOST'] ) ) ? $s['HTTP_X_FORWARDED_HOST'] : ( isset( $s['HTTP_HOST'] ) ? $s['HTTP_HOST'] : null );
  $host     = isset( $host ) ? $host : $s['SERVER_NAME'] . $port;
  return $protocol . '://' . $host;
}

function full_url( $s, $use_forwarded_host = false )
{
  return url_origin( $s, $use_forwarded_host ) . $s['REQUEST_URI'];
}
  $toAppendToUrl = '';
  if(isset($_GET["id"])){
    $id = $_GET["id"];
  } else {
    $max = pow(2, 24);
    $rand = openssl_random_pseudo_bytes($max);
    $id = sha1($rand);
    if(sizeof($_GET) == 0){ // if the query string is empty
      $toAppendToUrl = '?';  // start the query string
    } else {
      $toAppendToUrl = '&'; // otherwise, append to it
    }
    $toAppendToUrl .= 'id='.$id;
  }
  if(isset($_GET["next"])){
    $next = $_GET["next"];
  } else {
    $next = 0;
  }

  $absoluteUrl = full_url($_SERVER).$toAppendToUrl;
  // echo "<br \>".$absoluteUrl."<br \>";
  // if there is a "next" in the query string, create a version of $absoluteUrl with
  // next:=next+1
  $absoluteUrlSplit = explode('?', $absoluteUrl);
  $absoluteUrlNextPlusOne = $absoluteUrl;
  if(sizeof($absoluteUrlSplit) === 2){
    $queryString = $absoluteUrlSplit[1];
    parse_str($queryString, $queryStringParsed);
    $queryStringParsed['next'] += 1;
    $queryString = http_build_query($queryStringParsed);
    $absoluteUrlNextPlusOne = $absoluteUrlSplit[0]."?".$queryString;
  }
  $defaultTestEntry = Array('url' => null, 'string' => null, 'class' => 'disabled', 'a' => false, 'editable' => false);

  require_once('test_list.php'); //this returns $tests

  if($next == sizeof($tests)){
    // we are done 
    $bottomBox = 'The test is complete, thank you for your participation.';
  } else {
    $bottomBox = 'If you want to have a break, come back to this page and continue from where you left, just come back to this URL:<br /><div id="currentUrl">'.$absoluteUrl.'</div>';
  }
  // until this point, the content of $tests will always be the same for a given $id,
  // regardless of how many times we visited this page.
  for($n = 0; $n < sizeof($tests); $n++ ){
    //TODO: check if the corresponding file exists
    // meantime, let us just rely on the GET variable 'next'
    if($n <= $next){
      $tests[$n]['a'] = true;
      $tests[$n]['class'] = 'enabled done';
  // if we are going to re-run a test, return to the same page
      $tests[$n]['returnUrl'] = urlencode($absoluteUrl);
    }
    if($n == $next){
      $tests[$n]['editable'] = true;
      $tests[$n]['class'] = 'enabled editable';
  // if we are going to run a new test, return to the same page with next:=next+1
      $tests[$n]['returnUrl'] = urlencode($absoluteUrlNextPlusOne);
    }
  }
?>
<html>
<head>
  <style>
ul.tests-list li{
  margin: 10px 0 5px 0;

}
.done {
  list-style-image: url('assets/images/checkbox-checked.png');
}
.done a {
  color: green;
}
.editable{
  list-style-image: url('assets/images/arrow-checkbox-unchecked.png');
  list-style-position: inside;
  margin-left: -30px;
}
.disabled{
  color: grey;
  text-decoration: line-through;
  list-style-image: url('assets/images/checkbox-unchecked-disabled.png');
}
#currentUrl{
  font-weight: bold;
  padding-left: 20px;
  padding-top: 5px;
}

  </style>
  <script src="jquery-2.1.4.js"></script>
  <script>
  function confirmEditing(e){
    var message = 'Are you sure you want to edit this item? All previous changes will be lost';
    return window.confirm(message);
  }
  var elements;
  $(document).ready(function(){
    lis = $('ul');
    elements = $('li.done:not(.editable)', lis);
    for(var n = 0; n < elements.length; n++){
      elements[n].onclick = confirmEditing;
    }
    history.pushState({}, null,  location.pathname+location.search+'<?php echo $toAppendToUrl; ?>');

    // elements = $('li:not(.editable.done)', lis);
    // for(var element in elements){
    //   element.onclick = confirmEditing;
    // }
  });
  </script>
</head>
<body>

<ul class = "tests-list">
<?php foreach($tests as $n => $test) : ?> 
  <li class="test-element <?php echo $test['class'] ?>">
<?php 
if($test['a'] === true) {
  // parameters passed to the test are used to keep track of the state and should be returned back to
  // this page when it is called again.
  // These parameters are:
  // id= keeps track of the user and of the sorting of the tests in this page
  // next= keeps track of the first test not yet undertaken
  
  echo '<a href="'.$test['url'].'&returnUrl='.$test['returnUrl'].'">'.$n.' - '.$test['string'].'</a>';
} else {
  echo $n.' - '.$test['string'];
}
?>
  </li>
<?php endforeach; ?>
</ul>

  <div id="bottomBox">
  <?php if($bottomBox!=='') echo $bottomBox ?>
  </div>
</body>
</html>

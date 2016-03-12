<?php
// need to generate an array $tests containing the tests in the order they shuold be executed
  $preSurvey = $defaultTestEntry;
  $preSurvey['url'] = 'index.html?url=example_eval/pre_survey.xml';
  $preSurvey['string'] = 'Pre-survey';
  
  $postSurvey = $defaultTestEntry;
  $postSurvey['url'] = 'index.html?url=example_eval/post_survey.xml';
  $postSurvey['string'] = 'Post-survey';

  $abTests = Array($defaultTestEntry, $defaultTestEntry, $defaultTestEntry, $defaultTestEntry);
  $abTests[0]['url'] = 'index.html?url=example_eval/ABshort.xml';
  $abTests[0]['string'] = 'AB0';
  $abTests[1]['url'] = 'index.html?url=example_eval/ABshort.xml';
  $abTests[1]['string'] = 'AB1';
  $abTests[2]['url'] = 'index.html?url=example_eval/ABshort.xml';
  $abTests[2]['string'] = 'AB2';
  $abTests[3]['url'] = 'index.html?url=example_eval/ABshort.xml';
  $abTests[3]['string'] = 'AB3';

  $likertTest = $defaultTestEntry;
  $likertTest['url'] = 'index.html?url=example_eval/labelling.xml';
  $likertTest['string'] = 'Labelling';
  // the shuffling of the elements is bound to the last 8 characters of $id
  $seed = hexdec(substr($id, -8)); 
  //shuffling only the order of the ABtests
  fisherYatesShuffle($abTests, $seed);
  $tests = array_merge(Array($preSurvey), $abTests, Array($likertTest), Array($postSurvey));
  
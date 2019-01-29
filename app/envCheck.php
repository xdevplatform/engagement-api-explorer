<?php
$requiredEnvs = [
  'CONSUMER_KEY',
  'CONSUMER_SECRET',
  'ACCESS_TOKEN',
  'ACCESS_TOKEN_SECRET',
  'PREMIUM_SEARCH_API_URL',
];

$diff = array_diff_key(array_flip($requiredEnvs), $_ENV);

if (!empty($diff)) {
  http_response_code(500);
  $message = 'You need to set the following environment variables in order to run Engagement API Explorer:';
  $code = implode("\n", array_keys($diff));

  if (isset($_SERVER['DYNO'])) {
    $action = 'You can run <code>heroku config:set</code> or you can specify environment variables from your Heroku Dashboard.';
  } else {
    $action = 'Set your variables by creating a dotenv file in <code>.env/dev.env</code> or specify environment variables.';
  }
  
  $template = file_get_contents('views/error.html');
  $template = str_replace(['{{MESSAGE}}', '{{CODE}}', '{{ACTION}}'], [$message ?? '', $code ?? '', $action ?? ''], $template);
  echo $template;
  die;  
}

if (!preg_match('/https:\/\/api\.twitter\.com\/1\.1\/tweets\/search\/30day|fullarchive\/[\\d\\w\\-_]+\.json/', $_ENV['PREMIUM_SEARCH_API_URL'])) {
  $message = 'The Premium Search URL format is invalid. Make sure the URL matches this format:';
  $code = 'https://api.twitter.com/1.1/tweets/search/[30day|fullarchive]/[environment_label].json';
  $action = 'You can <a target="_blank" href="https://developer.twitter.com/en/docs/tweets/search/api-reference/premium-search.html#DataEndpoint">check the docs</a> for more details. If you’re stuck, the <a target="_blank" href="https://twittercommunity.com">Twitter Community</a> can help you.';
  $template = file_get_contents('views/error.html');
  $template = str_replace(['{{MESSAGE}}', '{{CODE}}', '{{ACTION}}'], [$message ?? '', $code ?? '', $action ?? ''], $template);
  echo $template;
  die;  
}
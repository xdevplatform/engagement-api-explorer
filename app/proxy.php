<?php
require_once 'vendor/autoload.php';
require_once 'env.php';
require_once 'bearer_token.php';

use Abraham\TwitterOAuth\TwitterOAuth;

function l(...$args) {
  $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
  $backtrace = array_shift($backtrace);
  $file = str_replace(getcwd(), '', $backtrace['file']);

  $output = array();
  ob_start();
  foreach ($args as $arg) {
    if (!(is_string($arg) || is_numeric($arg))) {
      var_dump($arg);
      $output[] = ob_get_contents();
    } else {
      $output[] = $arg;
    }
  }
  ob_end_clean();
  
  file_put_contents(
    'php://stderr', 
    sprintf('[%s] [%s:%d]: ', strftime('%c'), $file, $backtrace['line']) . 
    implode(' ', $output) .
    PHP_EOL);
}

function ls(...$args) {
  $backtrace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
  $backtrace = array_shift($backtrace);
  $file = str_replace(getcwd(), '', $backtrace['file']);

  file_put_contents(
    'php://stderr', 
    sprintf('[%s] [%s:%d]: ', strftime('%c'), $file, $backtrace['line']) . 
    sprintf(...$args) . 
    PHP_EOL);
}

$headers = getallheaders();
$headers = array_change_key_case($headers);

$url = $headers['x-request-url'] ?? null;

header('Content-type: application/json; charset: utf-8');

$url = $url ?? $_ENV['PREMIUM_SEARCH_API_URL'];

[$accessToken, $accessTokenSecret, $isBearerTokenRequest] = [
  $headers['x-access-token'],
  $headers['x-access-token-secret'],
  $headers['x-bearer-token'] ?? null];

if (!$accessToken || !$accessTokenSecret) {
  http_response_code(400);
  echo json_encode([
    'error' => 'Missing access token/access token secret.',
    'headers' => $headers,
    '$_SERVER' => $_SERVER,
  ]);

  die;
}

if ($isBearerTokenRequest) {
  $bearerToken = BearerToken::get();
}

$connection = new TwitterOAuth(
  $_ENV['CONSUMER_KEY'],
  $_ENV['CONSUMER_SECRET'],
  $isBearerTokenRequest ? null : $accessToken,
  $isBearerTokenRequest ? $bearerToken : $accessTokenSecret);

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    $urlParts = parse_url($url);
    $params = [];
    if (isset($urlParts['query'])) {
      parse_str($urlParts['query'], $params);
    }

    $result = $connection->get($url, $params);
    break;
  case 'POST':
    $params = json_decode(file_get_contents('php://input'), true) ?? [];
    $json = $headers['x-raw-body'] ?? null;
    $result = $connection->post($url, $params, $json);
    break;
}
l($connection);
http_response_code($connection->getLastHttpCode());
echo json_encode($result);

<?php

require_once 'vendor/autoload.php';
require_once 'app/env.php';

use Abraham\TwitterOAuth\TwitterOAuth;

$connection = new TwitterOAuth(
  $_ENV['CONSUMER_KEY'],
  $_ENV['CONSUMER_SECRET'],
  $_ENV['ACCESS_TOKEN'],
  $_ENV['ACCESS_TOKEN_SECRET']
);

if (isset($_GET['oauth_token']) && isset($_GET['oauth_verifier'])) {
  $oauth = $connection->oauth(
    'https://api.twitter.com/oauth/access_token', [
    'oauth_token' => $_GET['oauth_token'],
    'oauth_verifier' => $_GET['oauth_verifier'],
  ]);

  if (isset($oauth['oauth_token']) && isset($oauth['oauth_token_secret'])) {
    $header = sprintf(
      'Location: /?token=%s&secret=%s',
      urlencode($oauth['oauth_token']),
      urlencode($oauth['oauth_token_secret']));
    header($header);
    die;
  } else {
    echo 'Error.';
    die;
  }
}

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off' ? 'https' : 'http';

$callbackUrl = sprintf(
  '%s://%s%s',
  $https,
  $_SERVER['SERVER_NAME'],
  $_SERVER['REQUEST_URI']
);

$oauth = $connection->oauth(
  'https://api.twitter.com/oauth/request_token', [
  'callback_url' => $callbackUrl,
]);

if (isset($oauth['oauth_callback_confirmed']) &&
  $oauth['oauth_callback_confirmed'] === 'true') {
    $url = 'https://api.twitter.com/oauth/authenticate?oauth_token=' . $oauth['oauth_token'];
    header('Location: ' . $url);
    die;
}

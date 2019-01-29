<?php
require_once 'env.php';

class BearerToken {
  const FILENAME = './tmp/bearer_token';
  public static function get() {
    if (file_exists(static::FILENAME)) {
      $result = json_decode(file_get_contents(static::FILENAME));
      return $result->access_token;
    }

    $credentials = base64_encode(sprintf('%s:%s', $_ENV['CONSUMER_KEY'], $_ENV['CONSUMER_SECRET']));
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, 'https://api.twitter.com/oauth2/token');
    curl_setopt($curl, CURLOPT_POST, 1);
    curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query(['grant_type' => 'client_credentials']));
    curl_setopt($curl, CURLOPT_HTTPHEADER, ['Authorization: Basic ' . $credentials]);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    $body = curl_exec($curl);

    $result = json_decode($body);
    if (isset($result->access_token)) {
      file_put_contents(static::FILENAME, $body);
      return $result->access_token;
    } else {
      throw new Exception('Cannot get bearer token: ' . $body);
      return null;
    }
    
  }
}

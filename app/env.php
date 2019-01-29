<?php

$configFile = '.env';
if (file_exists($configFile)) {
  ini_set('auto_detect_line_endings', '1');
  foreach (file($configFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    [$key, $value] = explode('=', $line);
    trim($key);
    trim($value);
    $_ENV[$key] = $value;
  }
}

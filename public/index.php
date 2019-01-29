<?php
chdir('..');
require 'app/env.php';
require 'app/envCheck.php';

$allowedRoutes = [
  '/auth' => 'app/auth.php',
  '/proxy' => 'app/proxy.php',
  '/' => 'views/index.html',
];

[$route, ] = explode('?', $_SERVER['REQUEST_URI']);

if (isset($allowedRoutes[$route])) {
  require $allowedRoutes[$route];
}
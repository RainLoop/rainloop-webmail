<?php

// simple connection test

$host = 'imap.gmail.com';
$port = 993;

echo $host.':'.$port;

$errorStr = '';
$errorNo = 0;

$connection = stream_socket_client($host.':'.$port, $errorNo, $errorStr, 5, STREAM_CLIENT_CONNECT);
if (is_resource($connection)) {
	echo ' = OK';
	fclose($connection);
} else {
	echo ' = ERROR ([#'.$errorNo.'] '.$errorStr.')';
}
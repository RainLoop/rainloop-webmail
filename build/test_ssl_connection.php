<?php

// simple connection test

$host = 'imap.gmail.com';
$port = 993;

echo $host.':'.$port;

$streamContextSettings = array(
	'ssl' => array(
		'verify_host' => true,
		'verify_peer' => true,
		'verify_peer_name' => true,
		'allow_self_signed' => false
	)
);

$streamContext = stream_context_create($streamContextSettings);

$errorStr = '';
$errorNo = 0;

$connection = stream_socket_client($host.':'.$port, $errorNo, $errorStr, 5, STREAM_CLIENT_CONNECT, $streamContext);
if (is_resource($connection)) {
	echo ' = OK';
	fclose($connection);
} else {
	echo ' = ERROR ([#'.$errorNo.'] '.$errorStr.')';
}

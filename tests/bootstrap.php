<?php

	define('TEST_DATA_FOLDER', __DIR__.'/data');

	$_ENV['RAINLOOP_INCLUDE_AS_API'] = true;
	include __DIR__.'/../index.php';

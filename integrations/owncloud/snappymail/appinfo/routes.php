<?php

return [
	'routes' => [
		[
			'name' => 'page#index',
			'url' => '/',
			'verb' => 'GET'
		],
		[
			'name' => 'page#indexPost',
			'url' => '/',
			'verb' => 'POST'
		],
		[
			'name' => 'page#appGet',
			'url' => '/run/',
			'verb' => 'GET'
		],
		[
			'name' => 'page#appPost',
			'url' => '/run/',
			'verb' => 'POST'
		],
		[
			'name' => 'fetch#setPersonal',
			'url' => '/fetch/personal.php',
			'verb' => 'POST'
		],
		[
			'name' => 'fetch#setAdmin',
			'url' => '/fetch/admin.php',
			'verb' => 'POST'
		],
		[
			'name' => 'fetch#upgrade',
			'url' => '/fetch/upgrade',
			'verb' => 'POST'
		]
	]
];

<?php

return [
	'routes' => [
		[
			'name' => 'page#index',
			'url' => '/',
			'verb' => 'GET'
		],
		[
			'name' => 'page#appGet',
			'url' => '/app/',
			'verb' => 'GET'
		],
		[
			'name' => 'page#appPost',
			'url' => '/app/',
			'verb' => 'POST'
		],
		[
			'name' => 'ajax#setPersonal',
			'url' => '/ajax/personal.php',
			'verb' => 'POST'
		],
		[
			'name' => 'ajax#setAdmin',
			'url' => '/ajax/admin.php',
			'verb' => 'POST'
		]
	]
];

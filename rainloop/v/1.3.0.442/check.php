<?php

	$aRequirements = array(
		'cURL' => function_exists('curl_init'),
		'iconv' => function_exists('iconv'),
		'json' => function_exists('json_encode'),
		'DateTime' => class_exists('DateTime') && class_exists('DateTimeZone'),
		'libxml' => function_exists('libxml_use_internal_errors'),
		'dom' => class_exists('DOMDocument'),
		'Zlib' => function_exists('gzopen'),
		'PCRE' => function_exists('preg_replace'),
		'SPL' => function_exists('spl_autoload_register')
	);
	

	if (0 > version_compare(PHP_VERSION, '5.3.0'))
	{
		echo '<p style="color: red">';
		echo 'Your PHP version ('.PHP_VERSION.') is lower than the minimal required 5.3.0! (Error Code: 301)';
		echo '</p>';
		exit(301);
	}

	if (in_array(false,$aRequirements))
	{
		echo '<p>';
		echo 'The following PHP extensions are not available in your PHP configuration! (Error Code: 302)';
		echo '</p><ul>';

		foreach ($aRequirements as $sKey => $bValue)
		{
			if (!$bValue)
			{
				echo '<li>'.$sKey.'</li>';
			}
		}
		
		echo '</ul>';
		exit(302);
	}

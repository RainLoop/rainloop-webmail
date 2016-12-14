<?php

	if (defined('APP_VERSION'))
	{
		$aRequirements = array(
			'cURL' => function_exists('curl_init'),
			'iconv' => function_exists('iconv'),
			'json' => function_exists('json_decode'),
			'DateTime' => class_exists('DateTime') && class_exists('DateTimeZone'),
			'libxml' => function_exists('libxml_use_internal_errors'),
			'dom' => class_exists('DOMDocument'),
			'Zlib' => function_exists('gzopen') || function_exists('gzopen64'),
			'PCRE' => function_exists('preg_replace'),
			'SPL' => function_exists('spl_autoload_register')
		);

		if (version_compare(PHP_VERSION, '5.4.0', '<'))
		{
			echo '<p style="color: red">';
			echo '[301] Your PHP version ('.PHP_VERSION.') is lower than the minimal required 5.4.0!';
			echo '</p>';
			exit(301);
		}

		if (in_array(false, $aRequirements))
		{
			echo '<p>';
			echo '[302] The following PHP extensions are not available in your PHP configuration!';
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
	}

<?php

	if (defined('APP_VERSION'))
	{
		$aRequirements = array(
			'cURL' => extension_loaded('curl'),
			'mbstring' => extension_loaded('mbstring'),
			'Zlib' => extension_loaded('zlib'),
			// enabled by default:
			'json' => function_exists('json_decode'),
			'libxml' => function_exists('libxml_use_internal_errors'),
			'dom' => class_exists('DOMDocument')
		);

		if (version_compare(PHP_VERSION, '7.3.0', '<'))
		{
			echo '<p style="color: red">';
			echo '[301] Your PHP version ('.PHP_VERSION.') is lower than the minimal required 7.3.0!';
			echo '</p>';
			exit(301);
		}

		if (in_array(false, $aRequirements))
		{
			echo '<p>';
			echo '[302] The following PHP extensions are not available in your PHP configuration!';
			echo '</p>';

			echo '<ul>';
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

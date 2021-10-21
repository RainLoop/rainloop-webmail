<?php

	if (defined('APP_VERSION'))
	{
		if (version_compare(PHP_VERSION, '7.3.0', '<'))
		{
			echo '<p style="color: red">';
			echo '[301] Your PHP version ('.PHP_VERSION.') is lower than the minimal required 7.3.0!';
			echo '</p>';
			exit(301);
		}

		$aOptional = array(
			'cURL' => extension_loaded('curl'),
			'gd' => extension_loaded('gd'),
			'gmagick' => extension_loaded('gmagick'),
			'imagick' => extension_loaded('imagick'),
			'intl' => function_exists('idn_to_ascii'),
			'ldap' => extension_loaded('ldap'),
			'mysql' => extension_loaded('pdo_mysql'),
			'pgsql' => extension_loaded('pdo_pgsql'),
			'sqlite' => extension_loaded('pdo_sqlite'),
			'xxtea' => extension_loaded('xxtea'),
			'zip' => extension_loaded('zip')
		);

		$aRequirements = array(
			'mbstring' => extension_loaded('mbstring'),
			'Zlib' => extension_loaded('zlib'),
			// enabled by default:
			'json' => function_exists('json_decode'),
			'libxml' => function_exists('libxml_use_internal_errors'),
			'dom' => class_exists('DOMDocument')
		);

		if (in_array(false, $aRequirements))
		{
			echo '<p>[302] The following PHP extensions are not available in your PHP configuration!</p>';

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

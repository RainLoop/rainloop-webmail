<?php

// TODO

/**
 * @return string
 */
function __get_custom_data_full_path()
{
	return '';
	return '/var/rainloop-data-folder/'; // custom data folder path
}

/**
 * @param string $siteName
 * @return string
 */
function __get_private_data_folder_internal_name($siteName)
{
	return '_default_'; // default domain folder name
	return $siteName;
}

/**
 * @param string $siteName
 * @return string
 */
function __get_core_install_access_site($siteName)
{
	return $siteName; // allow all

	return in_array($siteName, array(
		'domain.com', 'domain.net'
	)) ? $siteName : '';
}

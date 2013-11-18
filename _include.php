<?php

// TODO

/**
 * @return string
 */
function __get_custom_data_full_path()
{
	return '';
	return '/var/external-rainloop-data-folder/'; // custom data folder path
}

/**
 * @param string $siteName
 * @return string
 */
function __get_private_data_folder_internal_name($siteName)
{
	return ''; // default value
	return $siteName;
}

<?php

namespace RainLoop\Enumerations;

abstract class UploadError
{
	const FILE_TYPE = 98;
	const UNKNOWN = 99;

	const CONFIG_SIZE = 1001;
	const ON_SAVING = 1002;
	const EMPTY_FILES_DATA = 1003;

	private static $messages = [
		\UPLOAD_ERR_INI_SIZE   => 'Filesize exceeds the upload_max_filesize directive in php.ini',
		\UPLOAD_ERR_FORM_SIZE  => 'Filesize exceeds the MAX_FILE_SIZE directive that was specified in the html form',
		\UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
		\UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
		\UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
		\UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
		\UPLOAD_ERR_EXTENSION  => 'File upload stopped by extension',
		98   => 'Invalid file type',
		99   => 'Unknown error',
		1001 => 'Filesize exceeds the config setting',
		1002 => 'Error saving file',
		1003 => 'File is empty'
	];

	public static function getMessage(int $code): string
	{
		return isset(static::$messages[$code]) ? static::$messages[$code] : 0;
	}

	protected function getUserMessage(int $iError, int &$iClientError): string
	{
		$iClientError = $iError;
		switch ($iError) {
			case \UPLOAD_ERR_OK:
			case \UPLOAD_ERR_PARTIAL:
			case \UPLOAD_ERR_NO_FILE:
			case static::FILE_TYPE:
				break;

			case \UPLOAD_ERR_INI_SIZE:
			case \UPLOAD_ERR_FORM_SIZE:
			case static::CONFIG_SIZE:
			case static::EMPTY_FILES_DATA:
				return 'File is too big';

			case \UPLOAD_ERR_NO_TMP_DIR:
			case \UPLOAD_ERR_CANT_WRITE:
			case \UPLOAD_ERR_EXTENSION:
			case static::ON_SAVING:
				$iClientError = static::FILE_ON_SAVING_ERROR;
				break;

			default:
				$iClientError = static::UNKNOWN;
				break;
		}

		return static::getMessage($iClientError);
	}

}

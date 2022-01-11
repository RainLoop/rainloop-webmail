<?php

namespace RainLoop\Enumerations;

abstract class UploadError
{
	// UPLOAD_ERR_OK; There is no error, the file uploaded with success.
	const NORMAL = 0;
	// UPLOAD_ERR_INI_SIZE; The uploaded file exceeds the upload_max_filesize directive in php.ini.
	const FILE_IS_TOO_BIG = 1;
	// UPLOAD_ERR_FORM_SIZE; The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.
//	const FORM_SIZE = 2;
	// UPLOAD_ERR_PARTIAL; The uploaded file was only partially uploaded.
	const FILE_PARTIALLY_UPLOADED = 3;
	// UPLOAD_ERR_NO_FILE; No file was uploaded.
	const FILE_NO_UPLOADED = 4;
	// UPLOAD_ERR_NO_TMP_DIR; Missing a temporary folder.
	const MISSING_TEMP_FOLDER = 6;
	// UPLOAD_ERR_CANT_WRITE; Failed to write file to disk.
	const FILE_ON_SAVING_ERROR = 7;
	// UPLOAD_ERR_EXTENSION; A PHP extension stopped the file upload
//	const EXTENSION = 8;

	const FILE_TYPE = 98;
	const UNKNOWN = 99;

	const CONFIG_SIZE = 1001;
	const ON_SAVING = 1002;
	const EMPTY_FILES_DATA = 1003;
}

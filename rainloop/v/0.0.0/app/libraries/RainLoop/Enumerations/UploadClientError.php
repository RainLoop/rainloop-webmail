<?php

namespace RainLoop\Enumerations;

class UploadClientError
{
	const NORMAL = 0;
	const FILE_IS_TOO_BIG = 1;
	const FILE_PARTIALLY_UPLOADED = 2;
	const FILE_NO_UPLOADED = 3;
	const MISSING_TEMP_FOLDER = 4;
	const FILE_ON_SAVING_ERROR = 5;
	const FILE_TYPE = 98;
	const UNKNOWN = 99;
}


<?php

namespace RainLoop\Providers\Storage\Enumerations;

/**
 * PHP 8.1
enum StorageType: int {
	case USER = 1;
}
*/
abstract class StorageType
{
	const CONFIG = 1;
	const NOBODY = 2;
	const SIGN_ME = 3;
	const SESSION = 4;
	const PGP = 5;
	const ROOT = 6;
}

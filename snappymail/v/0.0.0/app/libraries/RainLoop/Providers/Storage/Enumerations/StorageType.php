<?php

namespace RainLoop\Providers\Storage\Enumerations;

/**
 * PHP 8.1
enum StorageType: int {
	case USER = 1;
}
*/
class StorageType
{
	const USER = 1;
	const CONFIG = 2;
	const NOBODY = 3;
	const SIGN_ME = 4;
	const SESSION = 5;
	const PGP = 6;
	const ROOT = 7;
}

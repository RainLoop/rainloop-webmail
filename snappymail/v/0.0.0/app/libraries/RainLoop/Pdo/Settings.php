<?php

namespace RainLoop\Pdo;

class Settings
{
	public string $driver;

	public string $dsn;

	public string $user = '';

	public string $password = '';

	public string $sslCa = '';

	public bool $sslVerify = true;

	public string $sslCiphers = '';
}

<?php

require_once dirname(__FILE__) . '/base_facebook.php';

class RainLoopFacebook extends BaseFacebook
{
	private $rlUserHash;

	private $rlAccount;

	private $rlStorageProvaider;

	protected static $kSupportedKeys = array('state', 'code', 'access_token', 'user_id');

	public function __construct($config)
	{
		$this->rlUserHash = '';
		$this->rlAccount = null;
		$this->rlStorageProvaider = null;

		if (!empty($config['rlStorageProvaider']))
		{
			$this->rlStorageProvaider = $config['rlStorageProvaider'];
		}

		if (!empty($config['rlAccount']))
		{
			$this->rlAccount = $config['rlAccount'];
		}

		if (!empty($config['rlUserHash']))
		{
			$this->rlUserHash = (string) $config['rlUserHash'];
		}

		if (!class_exists('\\RainLoop\\Providers\\Storage\\Enumerations\\StorageType') || '' === $this->rlUserHash)
		{
			$this->rlStorageProvaider = null;
		}

		parent::__construct($config);
	}

	public function UserLogout()
	{
		$this->clearAllPersistentData();
	}

	protected function setPersistentData($key, $value)
	{
		if (!in_array($key, self::$kSupportedKeys))
		{
			self::errorLog('Unsupported key passed to setPersistentData.');
			return;
		}

		$session_var_name = $this->constructSessionVariableName($key);
		if ($this->rlStorageProvaider)
		{
			$this->rlStorageProvaider->Put(
				$this->rlAccount ? $this->rlAccount : null,
				$this->rlAccount ? \RainLoop\Providers\Storage\Enumerations\StorageType::USER :
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				$session_var_name, $value);
		}
	}

	protected function getPersistentData($key, $default = false)
	{
		if (!in_array($key, self::$kSupportedKeys))
		{
			self::errorLog('Unsupported key passed to getPersistentData.');
			return $default;
		}

		$session_var_name = $this->constructSessionVariableName($key);
		if ($this->rlStorageProvaider)
		{
			return $this->rlStorageProvaider->Get(
				$this->rlAccount ? $this->rlAccount : null,
				$this->rlAccount ? \RainLoop\Providers\Storage\Enumerations\StorageType::USER :
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				$session_var_name, $default);
		}
	}

	protected function clearPersistentData($key)
	{
		if (!in_array($key, self::$kSupportedKeys))
		{
			self::errorLog('Unsupported key passed to clearPersistentData.');
			return;
		}

		$session_var_name = $this->constructSessionVariableName($key);
		if ($this->rlStorageProvaider)
		{
			$this->rlStorageProvaider->Clear(
				$this->rlAccount ? $this->rlAccount : null,
				$this->rlAccount ? \RainLoop\Providers\Storage\Enumerations\StorageType::USER :
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				$session_var_name);
		}
	}

	protected function clearAllPersistentData()
	{
		foreach (self::$kSupportedKeys as $key)
		{
			$this->clearPersistentData($key);
		}
	}

	protected function constructSessionVariableName($key)
	{
		$parts = array('fb', $this->getAppId(), $key, md5($this->rlUserHash));
		return implode('_', $parts);
	}
}

<?php

namespace RainLoop\Common;

class RainLoopFacebookRedirectLoginHelper extends \Facebook\FacebookRedirectLoginHelper
{
	/**
	 * @var string
	 */
	private $rlAppId;

	/**
	 * @var string
	 */
	private $rlUserHash;

	/**
	 * @var mixed
	 */
	private $rlAccount;

	/**
	 * @var mixed
	 */
	private $rlStorageProvaider;

	public function __construct($redirectUrl, $appId = null, $appSecret = null)
	{
		parent::__construct($redirectUrl, $appId, $appSecret);

		$this->rlAppId = '';
		$this->rlUserHash = '';
		$this->rlAccount = null;
		$this->rlStorageProvaider = null;
	}

	/**
	 * @return string
	 */
	public function GetRLAppId()
	{
		return $this->rlAppId;
	}

	public function initRainLoopData($config)
	{
		if (!empty($config['rlAppId']))
		{
			$this->rlAppId = $config['rlAppId'];
		}

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

		if (!class_exists('RainLoop\Providers\Storage\Enumerations\StorageType') || '' === $this->rlUserHash)
		{
			$this->rlStorageProvaider = null;
		}
	}

	/**
	 * Stores a state string in session storage for CSRF protection.
	 * Developers should subclass and override this method if they want to store
	 *   this state in a different location.
	 *
	 * @param string $state
	 *
	 * @throws FacebookSDKException
	 */
	protected function storeState($state)
	{
		if ($this->rlStorageProvaider)
		{
			$this->rlStorageProvaider->Put(
				$this->rlAccount ? $this->rlAccount : null,
				$this->rlAccount ? \RainLoop\Providers\Storage\Enumerations\StorageType::USER :
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				$this->generateSessionVariableName(), $state);
		}
	}

	/**
	 * Loads a state string from session storage for CSRF validation.  May return
	 *   null if no object exists.  Developers should subclass and override this
	 *   method if they want to load the state from a different location.
	 *
	 * @return string|null
	 *
	 * @throws FacebookSDKException
	 */
	protected function loadState()
	{
		if ($this->rlStorageProvaider)
		{
			$state = $this->rlStorageProvaider->Get(
				$this->rlAccount ? $this->rlAccount : null,
				$this->rlAccount ? \RainLoop\Providers\Storage\Enumerations\StorageType::USER :
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				$this->generateSessionVariableName(), false);

			if (false !== $state)
			{
				$this->state = $state;
				return $this->state;
			}
		}

		return null;
	}

	private function generateSessionVariableName()
	{
		return implode('/', array('Fackebook', \md5($this->rlUserHash), 'Storage'));
	}
}

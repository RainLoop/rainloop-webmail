<?php

namespace RainLoop;

class Account
{
	/**
	 * @var string
	 */
	private $sEmail;

	/**
	 * @var string
	 */
	private $sLogin;

	/**
	 * @var int
	 */
	private $sPassword;

	/**
	 * @var bool
	 */
	private $bPasswordIsXOAuth2;

	/**
	 * @var string
	 */
	private $sSignMeToken;

	/**
	 * @var \RainLoop\Domain
	 */
	private $oDomain;

	/**
	 * @var string
	 */
	private $sParentEmail;

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param \RainLoop\Domain $oDomain
	 * @param bool $bPasswordIsXOAuth2 = false
	 * @param string $sSignMeToken = ''
	 * @param string $sParentEmail = '';
	 *
	 * @return void
	 */
	protected function __construct($sEmail, $sLogin, $sPassword, \RainLoop\Domain $oDomain, $bPasswordIsXOAuth2 = false, $sSignMeToken = '', $sParentEmail = '')
	{
		$this->sEmail = \strtolower($sEmail);
		$this->sLogin = $sLogin;
		$this->sPassword = $sPassword;
		$this->oDomain = $oDomain;
		$this->bPasswordIsXOAuth2 = $bPasswordIsXOAuth2;
		$this->sSignMeToken = $sSignMeToken;
		$this->sParentEmail = \strtolower($sParentEmail);
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param \RainLoop\Domain $oDomain
	 * @param bool $bPasswordIsXOAuth2 = false
	 * @param string $sSignMeToken = ''
	 * @param string $sParentEmail = ''
	 *
	 * @return \RainLoop\Account
	 */
	public static function NewInstance($sEmail, $sLogin, $sPassword, \RainLoop\Domain $oDomain, $bPasswordIsXOAuth2 = false, $sSignMeToken = '', $sParentEmail = '')
	{
		return new self($sEmail, $sLogin, $sPassword, $oDomain, $bPasswordIsXOAuth2, $sSignMeToken, $sParentEmail);
	}

	/**
	 * @return string
	 */
	public function Email()
	{
		return $this->sEmail;
	}

	/**
	 * @return string
	 */
	public function ParentEmail()
	{
		return $this->sParentEmail;
	}
	
	/**
	 * @return string
	 */
	public function ParentEmailHelper()
	{
		return 0 < \strlen($this->sParentEmail) ? $this->sParentEmail : $this->sEmail;
	}

	/**
	 * @return string
	 */
	public function Login()
	{
		return $this->sLogin;
	}

	/**
	 * @return string
	 */
	public function Password()
	{
		return $this->sPassword;
	}

	/**
	 * @return bool
	 */
	public function PasswordIsXOAuth2()
	{
		return $this->bPasswordIsXOAuth2;
	}

	/**
	 * @return bool
	 */
	public function SignMe()
	{
		return 0 < \strlen($this->sSignMeToken);
	}

	/**
	 * @return string
	 */
	public function SignMeToken()
	{
		return $this->sSignMeToken;
	}

	/**
	 * @return \RainLoop\Domain
	 */
	public function Domain()
	{
		return $this->oDomain;
	}

	/**
	 * @return \RainLoop\Domain
	 */
	public function Hash()
	{
		return md5(APP_SALT.$this->Email().APP_SALT.$this->oDomain->IncHost().APP_SALT.$this->oDomain->IncPort().
			APP_SALT.$this->Password().APP_SALT.($this->PasswordIsXOAuth2() ? '1' : '0').APP_SALT.$this->ParentEmail().APP_SALT);
	}

	/**
	 * @param string $sPassword
	 *
	 * @return void
	 */
	public function SetPassword($sPassword)
	{
		$this->sPassword = $sPassword;
	}

	/**
	 * @param string $sParentEmail
	 *
	 * @return void
	 */
	public function SetParentEmail($sParentEmail)
	{
		$this->sParentEmail = \strtolower($sParentEmail);
	}

	/**
	 * @return string
	 */
	public function GetAuthToken()
	{
		return \RainLoop\Utils::EncodeKeyValues(array(
			'token',
			$this->sEmail,
			$this->sLogin,
			$this->sPassword,
			$this->bPasswordIsXOAuth2 ? '1' : '0',
			$this->sSignMeToken,
			$this->sParentEmail,
			\microtime(true).\mt_rand(1000, 9999)
		));
	}
}

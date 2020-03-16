<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Poppassd;

/**
 * @category MailSo
 * @package Poppassd
 */
class PoppassdClient extends \MailSo\Net\NetClient
{
	/**
	 * @var bool
	 */
	private $bIsLoggined;

	/**
	 * @var int
	 */
	private $iRequestTime;

	protected function __construct()
	{
		$this->bIsLoggined = false;
		$this->iRequestTime = 0;

		parent::__construct();
	}

	public static function NewInstance() : self
	{
		return new self();
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\ResponseException
	 */
	public function Connect(string $sServerName, int $iPort = 106,
		int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		bool $bVerifySsl = false, bool $bAllowSelfSigned = true,
		string $sClientCert = '') : object
	{
		$this->iRequestTime = \microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned);

		$this->validateResponse();

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\ResponseException
	 */
	public function Login(string $sLogin, string $sPassword) : self
	{
		if ($this->bIsLoggined)
		{
			$this->writeLogException(
				new Exceptions\RuntimeException('Already authenticated for this session'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sLogin = \trim($sLogin);
		$sPassword = $sPassword;

		try
		{
			$this->sendRequestWithCheck('user', $sLogin, true);
			$this->sendRequestWithCheck('pass', $sPassword, true);
		}
		catch (\MailSo\Poppassd\Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new \MailSo\Poppassd\Exceptions\LoginBadCredentialsException(
					$oException->GetResponses(), '', 0, $oException),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->bIsLoggined = true;

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\Exception
	 */
	public function Logout() : self
	{
		if ($this->bIsLoggined)
		{
			$this->sendRequestWithCheck('quit');
		}

		$this->bIsLoggined = false;
		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\Exception
	 */
	public function NewPass(string $sNewPassword) : self
	{
		if ($this->bIsLoggined)
		{
			$this->sendRequestWithCheck('newpass', $sNewPassword);
		}
		else
		{
			$this->writeLogException(
				new \MailSo\Poppassd\Exceptions\RuntimeException('Required login'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $this;
	}

	private function secureRequestParams(string $sCommand, string $sAddToCommand) : string
	{
		$sResult = null;
		if (0 < \strlen($sAddToCommand))
		{
			switch (\strtolower($sCommand))
			{
				case 'pass':
				case 'newpass':
					$sResult = '********';
					break;
			}
		}

		return $sResult;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function sendRequest(string $sCommand, string $sAddToCommand = '') : self
	{
		if (0 === \strlen(\trim($sCommand)))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$sCommand = \trim($sCommand);
		$sRealCommand = $sCommand.(0 === \strlen($sAddToCommand) ? '' : ' '.$sAddToCommand);

		$sFakeCommand = '';
		$sFakeAddToCommand = $this->secureRequestParams($sCommand, $sAddToCommand);
		if (0 < \strlen($sFakeAddToCommand))
		{
			$sFakeCommand = $sCommand.' '.$sFakeAddToCommand;
		}

		$this->iRequestTime = \microtime(true);
		$this->sendRaw($sRealCommand, true, $sFakeCommand);

		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\Exception
	 */
	private function sendRequestWithCheck(string $sCommand, string $sAddToCommand = '', bool $bAuthRequestValidate = false) : self
	{
		$this->sendRequest($sCommand, $sAddToCommand);
		$this->validateResponse($bAuthRequestValidate);

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\ResponseException
	 */
	private function validateResponse(bool $bAuthRequestValidate = false) : self
	{
		$this->getNextBuffer();

		$bResult = false;
		if ($bAuthRequestValidate)
		{
			$bResult = (bool) \preg_match('/^[23]\d\d/', trim($this->sResponseBuffer));
		}
		else
		{
			$bResult = (bool) \preg_match('/^2\d\d/', \trim($this->sResponseBuffer));
		}

		if (!$bResult)
		{
			// POP3 validation hack
			$bResult = '+OK ' === \substr(\trim($this->sResponseBuffer), 0, 4);
		}

		if (!$bResult)
		{
			$this->writeLogException(
				new Exceptions\NegativeResponseException(),
				\MailSo\Log\Enumerations\Type::WARNING, true);
		}

		$this->writeLog((\microtime(true) - $this->iRequestTime),
			\MailSo\Log\Enumerations\Type::TIME);

		return $this;
	}

	protected function getLogName() : string
	{
		return 'POPPASSD';
	}
}

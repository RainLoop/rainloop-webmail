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

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		$this->bIsLoggined = false;
		$this->iRequestTime = 0;

		parent::__construct();
	}

	/**
	 * @return \MailSo\Poppassd\PoppassdClient
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param string $sServerName
	 * @param int $iPort = 106
	 * @param int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT
	 * @param bool $bVerifySsl = false
	 * @param bool $bAllowSelfSigned = true
	 *
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\ResponseException
	 */
	public function Connect($sServerName, $iPort = 106,
		$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		$bVerifySsl = false, $bAllowSelfSigned = true)
	{
		$this->iRequestTime = \microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned);

		$this->validateResponse();

		return $this;
	}

	/**
	 * @param string $sLogin = ''
	 * @param string $sPassword = ''
	 *
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\ResponseException
	 */
	public function Login($sLogin, $sPassword)
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
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\Exception
	 */
	public function Logout()
	{
		if ($this->bIsLoggined)
		{
			$this->sendRequestWithCheck('quit');
		}

		$this->bIsLoggined = false;
		return $this;
	}

	/**
	 * @param string $sNewPassword
	 *
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\Exception
	 */
	public function NewPass($sNewPassword)
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

	/**
	 * @param string $sCommand
	 * @param string $sAddToCommand
	 *
	 * @return string
	 */
	private function secureRequestParams($sCommand, $sAddToCommand)
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
	 * @param string $sCommand
	 * @param string $sAddToCommand = ''
	 *
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function sendRequest($sCommand, $sAddToCommand = '')
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
	 * @param string $sCommand
	 * @param string $sAddToCommand = ''
	 * @param bool $bAuthRequestValidate = false
	 *
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\Exception
	 */
	private function sendRequestWithCheck($sCommand, $sAddToCommand = '', $bAuthRequestValidate = false)
	{
		$this->sendRequest($sCommand, $sAddToCommand);
		$this->validateResponse($bAuthRequestValidate);

		return $this;
	}

	/**
	 * @param bool $bAuthRequestValidate = false
	 *
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Poppassd\Exceptions\ResponseException
	 */
	private function validateResponse($bAuthRequestValidate = false)
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

	/**
	 * @return string
	 */
	protected function getLogName()
	{
		return 'POPPASSD';
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \MailSo\Poppassd\PoppassdClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetLogger($oLogger)
	{
		parent::SetLogger($oLogger);

		return $this;
	}
}

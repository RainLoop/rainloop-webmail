<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Pop3;

/**
 * @category MailSo
 * @package Pop3
 */
class Pop3Client extends \MailSo\Net\NetClient
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
	 * @var array
	 */
	private $aCapa;

	/**
	 * @var string
	 */
	private $sLastMessage;

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();

		$this->bIsLoggined = false;
		$this->iRequestTime = 0;
		$this->aCapa = null;
		$this->sLastMessage = '';
	}

	/**
	 * @return \MailSo\Pop3\Pop3Client
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param string $sServerName
	 * @param int $iPort = 110
	 * @param int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT
	 * @param bool $bVerifySsl = false
	 * @param bool $bAllowSelfSigned = null
	 *
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\ResponseException
	 */
	public function Connect($sServerName, $iPort = 110,
		$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		$bVerifySsl = false, $bAllowSelfSigned = null)
	{
		$this->iRequestTime = microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned);
		
		$this->validateResponse();

		if (\MailSo\Net\Enumerations\ConnectionSecurityType::UseStartTLS(
			in_array('STLS', $this->Capa()), $this->iSecurityType))
		{
			$this->sendRequestWithCheck('STLS');
			$this->EnableCrypto();

			$this->aCapa = null;
		}
		else if (\MailSo\Net\Enumerations\ConnectionSecurityType::STARTTLS === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $this;
	}

	/**
	 * @param string $sLogin = ''
	 * @param string $sPassword = ''
	 *
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\ResponseException
	 */
	public function Login($sLogin, $sPassword)
	{
		if ($this->bIsLoggined)
		{
			$this->writeLogException(
				new Exceptions\RuntimeException('Already authenticated for this session'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sLogin = trim($sLogin);
		$sPassword = $sPassword;

		try
		{
			$this->sendRequestWithCheck('USER', $sLogin);
			$this->sendRequestWithCheck('PASS', $sPassword);
		}
		catch (\MailSo\Pop3\Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new \MailSo\Pop3\Exceptions\LoginBadCredentialsException(
					$oException->GetResponses(), '', 0, $oException),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->bIsLoggined = true;
		$this->aCapa = null;

		return $this;
	}

	/**
	 * @return bool
	 */
	public function IsLoggined()
	{
		return $this->IsConnected() && $this->bIsLoggined;
	}

	/**
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Noop()
	{
		$this->sendRequestWithCheck('NOOP');
		return $this;
	}

	/**
	 * @return array [MessagesCount, Size]
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Status()
	{
		$this->sendRequestWithCheck('STAT');

		$iMessageCount = $iSize = 0;
		sscanf($this->sLastMessage, '%d %d', $iMessageCount, $iSize);

		return array((int) $iMessageCount, (int) $iSize);
	}

	/**
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Capa()
	{
		if (null === $this->aCapa)
		{
			$this->sendRequestWithCheck('CAPA');

			$this->aCapa = array_filter(explode("\n", $this->readMultilineResponse()), function (&$sCapa) {
				return 0 < strlen(trim($sCapa));
			});

			$this->aCapa = array_map('trim', $this->aCapa);
		}

		return $this->aCapa;
	}

	/**
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Logout()
	{
		if ($this->bIsLoggined)
		{
			$this->sendRequestWithCheck('QUIT');
		}

		$this->bIsLoggined = false;
		return $this;
	}

	/**
	 * @param string $sCommand
	 * @param string $sAddToCommand = ''
	 *
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	protected function sendRequest($sCommand, $sAddToCommand = '')
	{
		if (0 === strlen(trim($sCommand)))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$sCommand = trim($sCommand);
		$sRealCommand = $sCommand.(0 === strlen($sAddToCommand) ? '' : ' '.$sAddToCommand);

		$sFakeCommand = '';
		$sFakeAddToCommand = $this->secureRequestParams($sCommand, $sAddToCommand);
		if (0 < strlen($sFakeAddToCommand))
		{
			$sFakeCommand = $sCommand.' '.$sFakeAddToCommand;
		}

		$this->iRequestTime = microtime(true);
		$this->sendRaw($sRealCommand, true, $sFakeCommand);
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
		if (0 < strlen($sAddToCommand))
		{
			switch ($sCommand)
			{
				case 'PASS':
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
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	private function sendRequestWithCheck($sCommand, $sAddToCommand = '')
	{
		$this->sendRequest($sCommand, $sAddToCommand);
		return $this->validateResponse();
	}

	/**
	 * @return string
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\ResponseException
	 */
	private function validateResponse()
	{
		$this->getNextBuffer();

		$this->sLastMessage = '';
		$sStatus = $sMessage = '';
		$sBuffer = trim($this->sResponseBuffer);
		$sStatus = $sBuffer;
		if (false !== strpos($sBuffer, ' '))
		{
			list($sStatus, $sMessage) = explode(' ', $sBuffer, 2);
		}

		$this->sLastMessage = $sMessage;

		if ($sStatus != '+OK')
		{
			$this->writeLogException(
				new Exceptions\NegativeResponseException(),
				\MailSo\Log\Enumerations\Type::WARNING, true);
		}

		$this->writeLog((microtime(true) - $this->iRequestTime),
			\MailSo\Log\Enumerations\Type::TIME);
	}

	/**
	 * @return string
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function readMultilineResponse()
	{
		$this->iRequestTime = microtime(true);

		$sResult = '';
		do
		{
			$this->getNextBuffer();
			if (0 === strpos($this->sResponseBuffer, '.'))
			{
				$sResult .= substr($this->sResponseBuffer, 1);
			}
			else
			{
				$sResult .= $this->sResponseBuffer;
			}
		}
		while ('.' !== rtrim($this->sResponseBuffer, "\r\n"));

		$this->writeLog((microtime(true) - $this->iRequestTime),
			\MailSo\Log\Enumerations\Type::TIME);

		return $sResult;
	}

	/**
	 * @return string
	 */
	protected function getLogName()
	{
		return 'POP3';
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 * @return \MailSo\Pop3\Pop3Client
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetLogger($oLogger)
	{
		parent::SetLogger($oLogger);

		return $this;
	}
}

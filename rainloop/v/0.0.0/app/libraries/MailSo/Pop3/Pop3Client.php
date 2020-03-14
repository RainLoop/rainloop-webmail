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

	public static function NewInstance() : self
	{
		return new self();
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\ResponseException
	 */
	public function Connect(string $sServerName, int $iPort = 110,
		int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		bool $bVerifySsl = false, bool $bAllowSelfSigned = null,
		string $sClientCert = '') : object
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\ResponseException
	 */
	public function Login(string $sLogin, string $sPassword) : self
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

	public function IsLoggined() : bool
	{
		return $this->IsConnected() && $this->bIsLoggined;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Noop() : self
	{
		$this->sendRequestWithCheck('NOOP');
		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Status() : array
	{
		$this->sendRequestWithCheck('STAT');

		$iMessageCount = $iSize = 0;
		sscanf($this->sLastMessage, '%d %d', $iMessageCount, $iSize);

		return array((int) $iMessageCount, (int) $iSize);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Capa() : self
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
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	public function Logout() : self
	{
		if ($this->bIsLoggined)
		{
			$this->sendRequestWithCheck('QUIT');
		}

		$this->bIsLoggined = false;
		return $this;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	protected function sendRequest(string $sCommand, string $sAddToCommand = '') : self
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

	private function secureRequestParams(string $sCommand, string $sAddToCommand) : string
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\Exception
	 */
	private function sendRequestWithCheck(string $sCommand, string $sAddToCommand = '') : self
	{
		$this->sendRequest($sCommand, $sAddToCommand);
		return $this->validateResponse();
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Pop3\Exceptions\ResponseException
	 */
	private function validateResponse() : string
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
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function readMultilineResponse() : string
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

	protected function getLogName() : string
	{
		return 'POP3';
	}

}

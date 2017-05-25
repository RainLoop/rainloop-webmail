<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Smtp;

/**
 * @category MailSo
 * @package Smtp
 */
class SmtpClient extends \MailSo\Net\NetClient
{
	/**
	 * @var bool
	 */
	private $bHelo;

	/**
	 * @var bool
	 */
	private $bRcpt;

	/**
	 * @var bool
	 */
	private $bMail;

	/**
	 * @var bool
	 */
	private $bData;

	/**
	 * @var array
	 */
	private $aAuthTypes;

	/**
	 * @var array
	 */
	private $aCapa;

	/**
	 * @var int
	 */
	private $iSizeCapaValue;

	/**
	 * @var int
	 */
	private $iRequestTime;

	/**
	 * @var array
	 */
	private $aResults;

	/**
	 * @var bool
	 */
	public $__USE_SINGLE_LINE_AUTH_PLAIN_COMMAND = false;

	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();

		$this->aAuthTypes = array();

		$this->iRequestTime = 0;
		$this->iSizeCapaValue = 0;
		$this->aResults = array();
		$this->aCapa = array();

		$this->bHelo = false;
		$this->bRcpt = false;
		$this->bMail = false;
		$this->bData = false;
	}

	/**
	 * @return \MailSo\Smtp\SmtpClient
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return bool
	 */
	public function IsSupported($sCapa)
	{
		return in_array(strtoupper($sCapa), $this->aCapa);
	}

	/**
	 * @return bool
	 */
	public function IsAuthSupported($sAuth)
	{
		return in_array(strtoupper($sAuth), $this->aAuthTypes);
	}

	/**
	 * @return bool
	 */
	public function HasSupportedAuth()
	{
		return $this->IsAuthSupported('PLAIN') || $this->IsAuthSupported('LOGIN');
	}

	/**
	 * @return string
	 */
	public static function EhloHelper()
	{
		$sEhloHost = empty($_SERVER['SERVER_NAME']) ? '' : \trim($_SERVER['SERVER_NAME']);
		if (empty($sEhloHost))
		{
			$sEhloHost = empty($_SERVER['HTTP_HOST']) ? '' : \trim($_SERVER['HTTP_HOST']);
		}

		if (empty($sEhloHost))
		{
			$sEhloHost = \function_exists('gethostname') ? \gethostname() : 'localhost';
		}

		$sEhloHost = \trim(\preg_replace('/:\d+$/', '', \trim($sEhloHost)));

		if (\preg_match('/^\d+\.\d+\.\d+\.\d+$/', $sEhloHost))
		{
			$sEhloHost = '['.$sEhloHost.']';
		}

		return empty($sEhloHost) ? 'localhost' : $sEhloHost;
	}

	/**
	 * @param string $sServerName
	 * @param int $iPort = 25
	 * @param string $sEhloHost = '[127.0.0.1]'
	 * @param int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT
	 * @param bool $bVerifySsl = false
	 * @param bool $bAllowSelfSigned = true
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\ResponseException
	 */
	public function Connect($sServerName, $iPort = 25, $sEhloHost = '[127.0.0.1]',
		$iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		$bVerifySsl = false, $bAllowSelfSigned = true)
	{
		$this->iRequestTime = microtime(true);

		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned);

		$this->validateResponse(220);

		$this->preLoginStartTLSAndEhloProcess($sEhloHost);

		return $this;
	}

	/**
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param boolean $bUseAuthPlainIfSupported = true
	 * @param boolean $bUseAuthCramMd5IfSupported = true
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Login($sLogin, $sPassword, $bUseAuthPlainIfSupported = true, $bUseAuthCramMd5IfSupported = true)
	{
		$sLogin = \MailSo\Base\Utils::IdnToAscii(\MailSo\Base\Utils::Trim($sLogin));

		if ($bUseAuthCramMd5IfSupported && $this->IsAuthSupported('CRAM-MD5'))
		{
			try
			{
				$this->sendRequestWithCheck('AUTH', 334, 'CRAM-MD5');
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadMethodException(
						$oException->GetResponses(), $oException->getMessage(), 0, $oException),
					\MailSo\Log\Enumerations\Type::NOTICE, true);
			}

			$sTicket = '';

			$sContinuationResponse = !empty($this->aResults[0]) ? \trim($this->aResults[0]) : '';
			if ($sContinuationResponse && '334 ' === \substr($sContinuationResponse, 0, 4) && 0 < \strlen(\substr($sContinuationResponse, 4)))
			{
				$sTicket = @\base64_decode(\substr($sContinuationResponse, 4));
				$this->writeLogWithCrlf('ticket: '.$sTicket);
			}

			if (empty($sTicket))
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\NegativeResponseException(),
					\MailSo\Log\Enumerations\Type::NOTICE, true
				);
			}

			try
			{
				$this->sendRequestWithCheck(\base64_encode($sLogin.' '.\MailSo\Base\Utils::Hmac($sTicket, $sPassword)), 235, '', true);
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadCredentialsException(
						$oException->GetResponses(), $oException->getMessage(), 0, $oException),
					\MailSo\Log\Enumerations\Type::NOTICE, true);
			}
		}
		else if ($bUseAuthPlainIfSupported && $this->IsAuthSupported('PLAIN'))
		{
			if ($this->__USE_SINGLE_LINE_AUTH_PLAIN_COMMAND)
			{
				try
				{
					$this->sendRequestWithCheck('AUTH', 235, 'PLAIN '.\base64_encode("\0".$sLogin."\0".$sPassword), true);
				}
				catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
				{
					$this->writeLogException(
						new \MailSo\Smtp\Exceptions\LoginBadCredentialsException(
							$oException->GetResponses(), $oException->getMessage(), 0, $oException),
						\MailSo\Log\Enumerations\Type::NOTICE, true);
				}
			}
			else
			{
				try
				{
					$this->sendRequestWithCheck('AUTH', 334, 'PLAIN');
				}
				catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
				{
					$this->writeLogException(
						new \MailSo\Smtp\Exceptions\LoginBadMethodException(
							$oException->GetResponses(), $oException->getMessage(), 0, $oException),
						\MailSo\Log\Enumerations\Type::NOTICE, true);
				}

				try
				{
					$this->sendRequestWithCheck(\base64_encode("\0".$sLogin."\0".$sPassword), 235, '', true);
				}
				catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
				{
					$this->writeLogException(
						new \MailSo\Smtp\Exceptions\LoginBadCredentialsException(
							$oException->GetResponses(), $oException->getMessage(), 0, $oException),
						\MailSo\Log\Enumerations\Type::NOTICE, true);
				}
			}
		}
		else if ($this->IsAuthSupported('LOGIN'))
		{
			try
			{
				$this->sendRequestWithCheck('AUTH', 334, 'LOGIN');
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadMethodException(
						$oException->GetResponses(), $oException->getMessage(), 0, $oException),
					\MailSo\Log\Enumerations\Type::NOTICE, true);
			}

			try
			{
				$this->sendRequestWithCheck(\base64_encode($sLogin), 334, '');
				$this->sendRequestWithCheck(\base64_encode($sPassword), 235, '', true);
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadCredentialsException(
						$oException->GetResponses(), $oException->getMessage(), 0, $oException),
					\MailSo\Log\Enumerations\Type::NOTICE, true);
			}
		}
		else
		{
			$this->writeLogException(
				new \MailSo\Smtp\Exceptions\LoginBadMethodException(),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		return $this;
	}

	/**
	 * @param string $sXOAuth2Token
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function LoginWithXOauth2($sXOAuth2Token)
	{
		if ($this->IsAuthSupported('XOAUTH2'))
		{
			try
			{
				$this->sendRequestWithCheck('AUTH', 235, 'XOAUTH2 '.\trim($sXOAuth2Token));
			}
			catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
			{
				$this->writeLogException(
					new \MailSo\Smtp\Exceptions\LoginBadCredentialsException(
						$oException->GetResponses(), $oException->getMessage(), 0, $oException),
					\MailSo\Log\Enumerations\Type::NOTICE, true);
			}
		}
		else
		{
			$this->writeLogException(
				new \MailSo\Smtp\Exceptions\LoginBadMethodException(),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		return $this;
	}

	/**
	 * @param string $sFrom
	 * @param string $sSizeIfSupported = ''
	 * @param bool $bDsn = false
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function MailFrom($sFrom, $sSizeIfSupported = '', $bDsn = false)
	{
		$sFrom = \MailSo\Base\Utils::IdnToAscii(
			\MailSo\Base\Utils::Trim($sFrom), true);

		$sCmd = 'FROM:<'.$sFrom.'>';

		$sSizeIfSupported = (string) $sSizeIfSupported;
		if (0 < \strlen($sSizeIfSupported) && \is_numeric($sSizeIfSupported) && $this->IsSupported('SIZE'))
		{
			$sCmd .= ' SIZE='.$sSizeIfSupported;
		}

		if ($bDsn && $this->IsSupported('DSN'))
		{
			$sCmd .= ' RET=HDRS';
		}

		$this->sendRequestWithCheck('MAIL', 250, $sCmd);

		$this->bMail = true;
		$this->bRcpt = false;
		$this->bData = false;

		return $this;
	}

	/**
	 * @param string $sTo
	 * @param bool $bDsn = false
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Rcpt($sTo, $bDsn = false)
	{
		if (!$this->bMail)
		{
			$this->writeLogException(
				new Exceptions\RuntimeException('No sender reverse path has been supplied'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sTo = \MailSo\Base\Utils::IdnToAscii(
			\MailSo\Base\Utils::Trim($sTo), true);

		$sCmd = 'TO:<'.$sTo.'>';

		if ($bDsn && $this->IsSupported('DSN'))
		{
			$sCmd .= ' NOTIFY=SUCCESS,FAILURE';
		}

		$this->sendRequestWithCheck('RCPT', array(250, 251), $sCmd);

		$this->bRcpt = true;

		return $this;
	}

	/**
	 * @param string $sTo
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function MailTo($sTo)
	{
		return $this->Rcpt($sTo);
	}

	/**
	 * @param string $sData
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Data($sData)
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sData, true))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$rDataStream = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($sData);
		unset($sData);
		$this->DataWithStream($rDataStream);
		\MailSo\Base\ResourceRegistry::CloseMemoryResource($rDataStream);

		return $this;
	}

	/**
	 * @param resource $rDataStream
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function DataWithStream($rDataStream)
	{
		if (!\is_resource($rDataStream))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		if (!$this->bRcpt)
		{
			$this->writeLogException(
				new Exceptions\RuntimeException('No recipient forward path has been supplied'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->sendRequestWithCheck('DATA', 354);

		$this->writeLog('Message data.', \MailSo\Log\Enumerations\Type::NOTE);

		$this->bRunningCallback = true;

		while (!\feof($rDataStream))
		{
			$sBuffer = \fgets($rDataStream);
			if (false !== $sBuffer)
			{
				if (0 === \strpos($sBuffer, '.'))
				{
					$sBuffer = '.'.$sBuffer;
				}

				$this->sendRaw(\rtrim($sBuffer, "\r\n"), false);

				\MailSo\Base\Utils::ResetTimeLimit();
				continue;
			}
			else if (!\feof($rDataStream))
			{
				$this->writeLogException(
					new Exceptions\RuntimeException('Cannot read input resource'),
					\MailSo\Log\Enumerations\Type::ERROR, true);
			}

			break;
		}

		$this->sendRequestWithCheck('.', 250);

		$this->bRunningCallback = false;

		$this->bData = true;

		return $this;
	}

	/**
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Rset()
	{
		$this->sendRequestWithCheck('RSET', array(250, 220));

		$this->bMail = false;
		$this->bRcpt = false;
		$this->bData = false;

		return $this;
	}

	/**
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Vrfy($sUser)
	{
		$sUser = \MailSo\Base\Utils::IdnToAscii(
			\MailSo\Base\Utils::Trim($sUser));

		$this->sendRequestWithCheck('VRFY', array(250, 251, 252), $sUser);

		return $this;
	}

	/**
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Noop()
	{
		$this->sendRequestWithCheck('NOOP', 250);

		return $this;
	}

	/**
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Logout()
	{
		if ($this->IsConnected())
		{
			$this->sendRequestWithCheck('QUIT', 221);
		}

		$this->bHelo = false;
		$this->bMail = false;
		$this->bRcpt = false;
		$this->bData = false;

		return $this;
	}

	/**
	 * @param string $sEhloHost
	 *
	 * @return void
	 */
	private function preLoginStartTLSAndEhloProcess($sEhloHost)
	{
		if ($this->bHelo)
		{
			$this->writeLogException(
				new Exceptions\RuntimeException('Cannot issue EHLO/HELO to existing session'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->ehloOrHelo($sEhloHost);

		if (\MailSo\Net\Enumerations\ConnectionSecurityType::UseStartTLS(
			$this->IsSupported('STARTTLS'), $this->iSecurityType, $this->HasSupportedAuth()))
		{
			$this->sendRequestWithCheck('STARTTLS', 220);
			$this->EnableCrypto();

			$this->ehloOrHelo($sEhloHost);
		}
		else if (\MailSo\Net\Enumerations\ConnectionSecurityType::STARTTLS === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('STARTTLS is not supported'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->bHelo = true;
	}

	/**
	 * @param string $sCommand
	 * @param string $sAddToCommand = ''
	 * @param bool $bSecureLog = false
	 *
	 * @return void
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function sendRequest($sCommand, $sAddToCommand = '', $bSecureLog = false)
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sCommand, true))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$sCommand = \trim($sCommand);
		$sRealCommand = $sCommand.(0 === \strlen($sAddToCommand) ? '' : ' '.$sAddToCommand);

		$sFakeCommand = ($bSecureLog) ? '********' : '';

		$this->iRequestTime = \microtime(true);
		$this->sendRaw($sRealCommand, true, $sFakeCommand);

		return $this;
	}

	/**
	 * @param string $sCommand
	 * @param int|array $mExpectCode
	 * @param string $sAddToCommand = ''
	 * @param bool $bSecureLog = false
	 *
	 * @return void
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	private function sendRequestWithCheck($sCommand, $mExpectCode, $sAddToCommand = '', $bSecureLog = false)
	{
		$this->sendRequest($sCommand, $sAddToCommand, $bSecureLog);
		$this->validateResponse($mExpectCode);
	}

	/**
	 * @param string $sHost
	 *
	 * @return void
	 */
	private function ehloOrHelo($sHost)
	{
		try
		{
			$this->ehlo($sHost);
		}
		catch (\Exception $oException)
		{
			try
			{
				$this->helo($sHost);
			}
			catch (\Exception $oException)
			{
				throw $oException;
			}
		}

		return $this;
	}

	/**
	 * @param string $sHost
	 *
	 * @return void
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	private function ehlo($sHost)
	{
		$this->sendRequestWithCheck('EHLO', 250, $sHost);

		foreach ($this->aResults as $sLine)
		{
			$aMatch = array();
			if (\preg_match('/[\d]+[ \-](.+)$/', $sLine, $aMatch) && isset($aMatch[1]) && 0 < \strlen($aMatch[1]))
			{
				$sLine = \trim($aMatch[1]);
				$aLine = \preg_split('/[ =]/', $sLine, 2);
				if (\is_array($aLine) && 0 < \count($aLine) && !empty($aLine[0]))
				{
					$sCapa = \strtoupper($aLine[0]);
					if (('AUTH' === $sCapa || 'SIZE' === $sCapa) && !empty($aLine[1]))
					{
						$sSubLine = \trim(\strtoupper($aLine[1]));
						if (0 < \strlen($sSubLine))
						{
							if ('AUTH' === $sCapa)
							{
								$this->aAuthTypes = \explode(' ', $sSubLine);
							}
							else if ('SIZE' === $sCapa && \is_numeric($sSubLine))
							{
								$this->iSizeCapaValue = (int) $sSubLine;
							}
						}
					}

					$this->aCapa[] = $sCapa;
				}
			}
		}
	}

	/**
	 * @param string $sHost
	 *
	 * @return void
	 *
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	private function helo($sHost)
	{
		$this->sendRequestWithCheck('HELO', 250, $sHost);
		$this->aAuthTypes = array();
		$this->iSizeCapaValue = 0;
		$this->aCapa = array();
	}

	/**
	 * @param int|array $mExpectCode
	 *
	 * @return void
	 *
	 * @throws \MailSo\Smtp\Exceptions\ResponseException
	 */
	private function validateResponse($mExpectCode)
	{
		if (!\is_array($mExpectCode))
		{
			$mExpectCode = array((int) $mExpectCode);
		}
		else
		{
			$mExpectCode = \array_map('intval', $mExpectCode);
		}

		$aParts = array('', '', '');
		$this->aResults = array();
		do
		{
			$this->getNextBuffer();
			$aParts = \preg_split('/([\s\-]+)/', $this->sResponseBuffer, 2, PREG_SPLIT_DELIM_CAPTURE);

			if (\is_array($aParts) && 3 === \count($aParts) && \is_numeric($aParts[0]))
			{
				if ('-' !== \substr($aParts[1], 0, 1) && !\in_array((int) $aParts[0], $mExpectCode))
				{
					$this->writeLogException(
						new Exceptions\NegativeResponseException($this->aResults, \trim(
							(0 < \count($this->aResults) ? \implode("\r\n", $this->aResults)."\r\n" : '').
							$this->sResponseBuffer)), \MailSo\Log\Enumerations\Type::ERROR, true);
				}
			}
			else
			{
				$this->writeLogException(
					new Exceptions\ResponseException($this->aResults, \trim(
						(0 < \count($this->aResults) ? \implode("\r\n", $this->aResults)."\r\n" : '').
						$this->sResponseBuffer)), \MailSo\Log\Enumerations\Type::ERROR, true);
			}

			$this->aResults[] = $this->sResponseBuffer;
		}
		while ('-' === \substr($aParts[1], 0, 1));

		$this->writeLog((microtime(true) - $this->iRequestTime),
			\MailSo\Log\Enumerations\Type::TIME);
	}

	/**
	 * @return string
	 */
	protected function getLogName()
	{
		return 'SMTP';
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \MailSo\Smtp\SmtpClient
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetLogger($oLogger)
	{
		parent::SetLogger($oLogger);

		return $this;
	}
}

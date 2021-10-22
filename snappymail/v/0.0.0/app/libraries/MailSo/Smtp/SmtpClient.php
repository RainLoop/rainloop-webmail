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
	private $bHelo = false;

	/**
	 * @var bool
	 */
	private $bRcpt = false;

	/**
	 * @var bool
	 */
	private $bMail = false;

	/**
	 * @var bool
	 */
	private $bData = false;

	/**
	 * @var array
	 */
	private $aAuthTypes = array();

	/**
	 * @var array
	 */
	private $aCapa = array();

	/**
	 * @var int
	 */
	private $iSizeCapaValue = 0;

	/**
	 * @var array
	 */
	private $aResults = array();

	public function IsSupported(string $sCapa) : bool
	{
		return \in_array(\strtoupper($sCapa), $this->aCapa);
	}

	public function IsAuthSupported(string $sAuth) : bool
	{
		return \in_array(\strtoupper($sAuth), $this->aAuthTypes);
	}

	public function HasSupportedAuth() : bool
	{
		return $this->IsAuthSupported('PLAIN') || $this->IsAuthSupported('LOGIN');
	}

	public static function EhloHelper() : string
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\ResponseException
	 */
	public function Connect(string $sServerName, int $iPort = 25,
		int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		bool $bVerifySsl = false, bool $bAllowSelfSigned = true,
		string $sClientCert = '', string $sEhloHost = '[127.0.0.1]') : void
	{
		parent::Connect($sServerName, $iPort, $iSecurityType, $bVerifySsl, $bAllowSelfSigned);

		$this->validateResponse(220);

		$this->preLoginStartTLSAndEhloProcess($sEhloHost);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Login(array $aCredentials) : self
	{
		$sLogin = \MailSo\Base\Utils::IdnToAscii(\MailSo\Base\Utils::Trim($aCredentials['Login']));
		$sPassword = $aCredentials['Password'];

//		$encrypted = !empty(\stream_get_meta_data($this->ConnectionResource())['crypto']);
		$type = '';
		$types = [
			// if !$encrypted:
			'SCRAM-SHA-256' => 1,
			'SCRAM-SHA-1' => 1,
			// if $encrypted:
			'CRAM-MD5' => $aCredentials['UseAuthCramMd5IfSupported'],
			'PLAIN' => $aCredentials['UseAuthPlainIfSupported'],
			'OAUTHBEARER' => $aCredentials['UseAuthOAuth2IfSupported'],
			'XOAUTH2' => $aCredentials['UseAuthOAuth2IfSupported'],
			'LOGIN' => 1, // $encrypted
		];
		foreach ($types as $sasl_type => $active) {
			if ($active && $this->IsAuthSupported($sasl_type) && \SnappyMail\SASL::isSupported($sasl_type)) {
				$type = $sasl_type;
				break;
			}
		}

		if (!$type) {
			\trigger_error("SMTP {$this->GetConnectedHost()} no supported AUTH options. Disable login" . ($this->IsSupported('STARTTLS') ? ' or try with STARTTLS' : ''));
			$this->writeLogException(
				new \MailSo\Smtp\Exceptions\LoginBadMethodException,
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$SASL = \SnappyMail\SASL::factory($type);
		$SASL->base64 = true;

		// Start authentication
		try
		{
			$sResult = $this->sendRequestWithCheck('AUTH', 334, $type);
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
			switch ($type)
			{
			// RFC 4616
			case 'PLAIN':
			case 'XOAUTH2':
			case 'OAUTHBEARER':
				$this->sendRequestWithCheck($SASL->authenticate($sLogin, $sPassword), 235, '', true);
				break;

			case 'LOGIN':
				$sResult = $this->sendRequestWithCheck($SASL->authenticate($sLogin, $sPassword, $sResult), 334, '');
				$this->sendRequestWithCheck($SASL->challenge($sResult), 235, '', true);
				break;

			// RFC 2195
			case 'CRAM-MD5':
				if (empty($sResult)) {
					$this->writeLogException(
						new \MailSo\Smtp\Exceptions\NegativeResponseException,
						\MailSo\Log\Enumerations\Type::NOTICE, true
					);
				}
				$this->sendRequestWithCheck($SASL->authenticate($sLogin, $sPassword, $sResult), 235, '', true);
				break;

			// RFC 5802
			case 'SCRAM-SHA-1':
			case 'SCRAM-SHA-256':
				$sResult = $this->sendRequestWithCheck($SASL->authenticate($sLogin, $sPassword, $sResult), 234, '');
				$sResult = $this->sendRequestWithCheck($SASL->challenge($sResult), 235, '', true);
				$SASL->verify($sResult);
				break;
			}
		}
		catch (\MailSo\Smtp\Exceptions\NegativeResponseException $oException)
		{
			$this->writeLogException(
				new \MailSo\Smtp\Exceptions\LoginBadCredentialsException(
					$oException->GetResponses(), $oException->getMessage(), 0, $oException),
				\MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function MailFrom(string $sFrom, string $sSizeIfSupported = '', bool $bDsn = false) : self
	{
		$sFrom = \MailSo\Base\Utils::IdnToAscii(
			\MailSo\Base\Utils::Trim($sFrom), true);

		$sCmd = 'FROM:<'.$sFrom.'>';

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
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Rcpt(string $sTo, bool $bDsn = false) : self
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

		$this->sendRequestWithCheck(
			'RCPT', array(250, 251), $sCmd, false,
			'Failed to add recipient "'.$sTo.'"'
		);

		$this->bRcpt = true;

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function MailTo(string $sTo) : self
	{
		return $this->Rcpt($sTo);
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Data(string $sData) : self
	{
		if (!\strlen(\trim($sData)))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function DataWithStream($rDataStream) : self
	{
		if (!\is_resource($rDataStream))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException;
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
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Rset() : self
	{
		$this->sendRequestWithCheck('RSET', array(250, 220));

		$this->bMail = false;
		$this->bRcpt = false;
		$this->bData = false;

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Vrfy(string $sUser) : self
	{
		$sUser = \MailSo\Base\Utils::IdnToAscii(
			\MailSo\Base\Utils::Trim($sUser));

		$this->sendRequestWithCheck('VRFY', array(250, 251, 252), $sUser);

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Noop() : self
	{
		$this->sendRequestWithCheck('NOOP', 250);

		return $this;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	public function Logout() : void
	{
		if ($this->IsConnected())
		{
			$this->sendRequestWithCheck('QUIT', 221);
		}

		$this->bHelo = false;
		$this->bMail = false;
		$this->bRcpt = false;
		$this->bData = false;
	}

	private function preLoginStartTLSAndEhloProcess(string $sEhloHost) : void
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
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	private function sendRequest(string $sCommand, string $sAddToCommand = '', bool $bSecureLog = false) : void
	{
		if (!\strlen(\trim($sCommand)))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->IsConnected(true);

		$sCommand = \trim($sCommand);
		$sRealCommand = $sCommand.(0 === \strlen($sAddToCommand) ? '' : ' '.$sAddToCommand);

		$sFakeCommand = ($bSecureLog) ? '********' : '';

		$this->sendRaw($sRealCommand, true, $sFakeCommand);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	private function sendRequestWithCheck(string $sCommand, $mExpectCode, string $sAddToCommand = '', bool $bSecureLog = false, string $sErrorPrefix = '') : string
	{
		$this->sendRequest($sCommand, $sAddToCommand, $bSecureLog);
		$this->validateResponse($mExpectCode, $sErrorPrefix);
		return empty($this->aResults[0]) ? '' : \trim(\substr($this->aResults[0], 4));
	}

	private function ehloOrHelo(string $sHost) : void
	{
		try
		{
			$this->ehlo($sHost);
		}
		catch (\Throwable $oException)
		{
			try
			{
				$this->helo($sHost);
			}
			catch (\Throwable $oException)
			{
				throw $oException;
			}
		}
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	private function ehlo(string $sHost) : void
	{
		$this->sendRequestWithCheck('EHLO', 250, $sHost);

		foreach ($this->aResults as $sLine)
		{
			$aMatch = array();
			if (\preg_match('/[\d]+[ \-](.+)$/', $sLine, $aMatch) && isset($aMatch[1]) && 0 < \strlen($aMatch[1]))
			{
				$sLine = \trim($aMatch[1]);
				$aLine = \preg_split('/[ =]/', $sLine, 2);
				if (!empty($aLine[0]))
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
	 * @throws \MailSo\Net\Exceptions\Exception
	 * @throws \MailSo\Smtp\Exceptions\Exception
	 */
	private function helo(string $sHost) : void
	{
		$this->sendRequestWithCheck('HELO', 250, $sHost);
		$this->aAuthTypes = array();
		$this->iSizeCapaValue = 0;
		$this->aCapa = array();
	}

	/**
	 * @throws \MailSo\Smtp\Exceptions\ResponseException
	 */
	private function validateResponse($mExpectCode, string $sErrorPrefix = '') : void
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

			if (3 === \count($aParts) && \is_numeric($aParts[0]))
			{
				if ('-' !== \substr($aParts[1], 0, 1) && !\in_array((int) $aParts[0], $mExpectCode))
				{
					$this->writeLogException(
						new Exceptions\NegativeResponseException($this->aResults,
							('' === $sErrorPrefix ? '' : $sErrorPrefix.': ').\trim(
							(\count($this->aResults) ? \implode("\r\n", $this->aResults)."\r\n" : '').
							$this->sResponseBuffer)), \MailSo\Log\Enumerations\Type::ERROR, true);
				}
			}
			else
			{
				$this->writeLogException(
					new Exceptions\ResponseException($this->aResults,
						('' === $sErrorPrefix ? '' : $sErrorPrefix.': ').\trim(
						(\count($this->aResults) ? \implode("\r\n", $this->aResults)."\r\n" : '').
						$this->sResponseBuffer)), \MailSo\Log\Enumerations\Type::ERROR, true);
			}

			$this->aResults[] = $this->sResponseBuffer;
		}
		while ('-' === \substr($aParts[1], 0, 1));
	}

	public function getLogName() : string
	{
		return 'SMTP';
	}

}

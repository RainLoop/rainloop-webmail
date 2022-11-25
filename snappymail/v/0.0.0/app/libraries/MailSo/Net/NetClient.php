<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Net;

/**
 * @category MailSo
 * @package Net
 */
abstract class NetClient
{
	/**
	 * @var resource
	 */
	private $rConnect = null;

	/**
	 * @var bool
	 */
	private $bUnreadBuffer = false;

	/**
	 * @var bool
	 */
	protected $bRunningCallback = false;

	/**
	 * @var string
	 */
	protected $sResponseBuffer = '';

	/**
	 * @var int
	 */
	protected $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::NONE;

	/**
	 * @var string
	 */
	private $sConnectedHost = '';

	/**
	 * @var int
	 */
	private $iConnectedPort = 0;

	/**
	 * @var bool
	 */
	private $bSecure = false;

	/**
	 * @var int
	 */
	private $iConnectTimeOut = 10;

	/**
	 * @var int
	 */
	private $iSocketTimeOut = 10;

	/**
	 * @var int
	 */
	private $iStartConnectTime = 0;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger = null;

	public function __destruct()
	{
		try
		{
			$this->Disconnect();
		}
		catch (\Throwable $oException) {}
	}

	public function GetConnectedHost() : string
	{
		return $this->sConnectedHost;
	}

	public function GetConnectedPort() : int
	{
		return $this->iConnectedPort;
	}

	public function SetTimeOuts(int $iConnectTimeOut = 10, int $iSocketTimeOut = 10) : void
	{
		$this->iConnectTimeOut = max(5, $iConnectTimeOut);
		$this->iSocketTimeOut = max(5, $iSocketTimeOut);
	}

	/**
	 * @return resource|null
	 */
	public function ConnectionResource()
	{
		return $this->rConnect;
	}

	public function capturePhpErrorWithException(int $iErrNo, string $sErrStr, string $sErrFile, int $iErrLine) : bool
	{
		throw new \MailSo\RuntimeException($sErrStr, $iErrNo);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\SocketAlreadyConnectedException
	 * @throws \MailSo\Net\Exceptions\SocketCanNotConnectToHostException
	 */
	public function Connect(ConnectSettings $oSettings) : void
	{
		$oSettings->host = \trim($oSettings->host);
		if (!\strlen($oSettings->host) || !\MailSo\Base\Validator::PortInt($oSettings->port)) {
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException,
				\LOG_ERR, true);
		}

		if ($this->IsConnected())
		{
			$this->writeLogException(
				new Exceptions\SocketAlreadyConnectedException,
				\LOG_ERR, true);
		}

		$sErrorStr = '';
		$iErrorNo = 0;

		$this->sConnectedHost = $oSettings->host;
		$this->iConnectedPort = $oSettings->port;
		$this->iSecurityType = $oSettings->type;
		$this->bSecure = \MailSo\Net\Enumerations\ConnectionSecurityType::UseSSL(
			$this->iConnectedPort, $this->iSecurityType);

		if (!\preg_match('/^[a-z0-9._]{2,8}:\/\//i', $this->sConnectedHost))
		{
			$this->sConnectedHost = ($this->bSecure ? 'ssl://' : 'tcp://').$this->sConnectedHost;
//			$this->sConnectedHost = ($this->bSecure ? 'ssl://' : '').$this->sConnectedHost;
		}

		if (!$this->bSecure && \MailSo\Net\Enumerations\ConnectionSecurityType::SSL === $this->iSecurityType)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\SocketUnsuppoterdSecureConnectionException('SSL isn\'t supported: ('.\implode(', ', \stream_get_transports()).')'),
				\LOG_ERR, true);
		}

		$this->iStartConnectTime = \microtime(true);
		$this->writeLog('Start connection to "'.$this->sConnectedHost.':'.$this->iConnectedPort.'"');

		$rStreamContext = \stream_context_create(array(
			'ssl' => $oSettings->ssl->jsonSerialize()
		));

		\set_error_handler(array($this, 'capturePhpErrorWithException'));

		try
		{
			$this->rConnect = \stream_socket_client($this->sConnectedHost.':'.$this->iConnectedPort,
				$iErrorNo, $sErrorStr, $this->iConnectTimeOut, STREAM_CLIENT_CONNECT, $rStreamContext);
		}
		catch (\Throwable $oExc)
		{
			$sErrorStr = $oExc->getMessage();
			$iErrorNo = $oExc->getCode();
		}

		\restore_error_handler();

		$this->writeLog('Connect ('.($this->rConnect ? 'success' : 'failed').')');

		if (!$this->rConnect)
		{
			$this->writeLogException(
				new Exceptions\SocketCanNotConnectToHostException(
					\MailSo\Base\Locale::ConvertSystemString($sErrorStr), (int) $iErrorNo,
					'Can\'t connect to host "'.$this->sConnectedHost.':'.$this->iConnectedPort.'"'
				), \LOG_NOTICE, true);
		}

		$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (raw connection)', \LOG_DEBUG);

		if ($this->rConnect)
		{
			if (\MailSo\Base\Utils::FunctionCallable('stream_set_timeout'))
			{
				\stream_set_timeout($this->rConnect, $this->iSocketTimeOut);
			}
		}
	}

	public function Encrypted() : bool
	{
		return $this->rConnect && !empty(\stream_get_meta_data($this->rConnect)['crypto']);
	}

	public function EnableCrypto(bool $insecure = false)
	{
		$bError = true;
		if ($this->rConnect && \MailSo\Base\Utils::FunctionCallable('stream_socket_enable_crypto')) {
			$crypto_method = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
			if (\defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT') && OPENSSL_VERSION_NUMBER >= 0x10101000) {
				$crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
			}
			if ($insecure) {
				$crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_0_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT;
			}
			if (\stream_socket_enable_crypto($this->rConnect, true, $crypto_method)) {
				$bError = false;
			}
		}

		if ($bError) {
			$this->writeLogException(
				new \MailSo\RuntimeException('Cannot enable STARTTLS.'),
				\LOG_ERR, true);
		}
	}

	/**
	 * @throws \MailSo\RuntimeException
	 * @throws \MailSo\Net\Exceptions\*
	 */
	public function Disconnect() : void
	{
		if ($this->rConnect)
		{
			if (!$this->bUnreadBuffer && !$this->bRunningCallback)
			{
				$this->Logout();
			}

			$bResult = \fclose($this->rConnect);

			$this->writeLog('Disconnected from "'.$this->sConnectedHost.':'.$this->iConnectedPort.'" ('.
				(($bResult) ? 'success' : 'unsuccess').')');

			if ($this->iStartConnectTime)
			{
				$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (net session)', \LOG_DEBUG);

				$this->iStartConnectTime = 0;
			}

			$this->rConnect = null;
		}
	}

	abstract public function Logout() : void;

	public function IsConnected(bool $bThrowExceptionOnFalse = false) : bool
	{
		if ($this->rConnect) {
			return true;
		}
		if ($bThrowExceptionOnFalse) {
			$this->writeLogException(
				new Exceptions\SocketConnectionDoesNotAvailableException,
				\LOG_ERR, true);
		}
		return false;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 */
	public function IsConnectedWithException() : void
	{
		$this->IsConnected(true);
	}

	public function StreamContextParams() : array
	{
		return $this->rConnect && \MailSo\Base\Utils::FunctionCallable('stream_context_get_options')
			? \stream_context_get_params($this->rConnect) : false;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketWriteException
	 */
	protected function sendRaw(string $sRaw, bool $bWriteToLog = true, string $sFakeRaw = '') : void
	{
		if ($this->bUnreadBuffer) {
			$this->writeLogException(new Exceptions\SocketUnreadBufferException, \LOG_ERR, true);
		}

		$sRaw .= "\r\n";

		$bFake = \strlen($sFakeRaw) && $this->oLogger && !$this->oLogger->ShowSecrets();
		if ($bFake) {
			$sFakeRaw .= "\r\n";
		}

		$mResult = \fwrite($this->rConnect, $sRaw);
		if (false === $mResult)
		{
			$this->IsConnected(true);
			$this->writeLogException(new Exceptions\SocketWriteException, \LOG_ERR, true);
		}
		else if ($bWriteToLog)
		{
			$this->writeLogWithCrlf('> '.($bFake ? $sFakeRaw : $sRaw));
		}
	}

	/**
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketReadException
	 */
	protected function getNextBuffer(?int $iReadLen = null, bool $bForceLogin = false) : void
	{
		if (null === $iReadLen)
		{
			$this->sResponseBuffer = \fgets($this->rConnect);
		}
		else
		{
			$this->sResponseBuffer = '';
			$iRead = $iReadLen;
			while (0 < $iRead)
			{
				$sAddRead = \fread($this->rConnect, $iRead);
				if (false === $sAddRead)
				{
					$this->sResponseBuffer = false;
					break;
				}

				$this->sResponseBuffer .= $sAddRead;
				$iRead -= \strlen($sAddRead);
			}
		}

		if (false === $this->sResponseBuffer)
		{
			$this->IsConnected(true);
			$this->bUnreadBuffer = true;

			$aSocketStatus = \stream_get_meta_data($this->rConnect);
			if (isset($aSocketStatus['timed_out']) && $aSocketStatus['timed_out'])
			{
				$this->writeLogException(
					new Exceptions\SocketReadTimeoutException,
						\LOG_ERR, true);
			}
			else
			{
				$this->writeLog('Stream Meta: '.\print_r($aSocketStatus, true), \LOG_ERR);

				$this->writeLogException(
					new Exceptions\SocketReadException,
						\LOG_ERR, true);
			}
		}
		else
		{
			$iReadedLen = \strlen($this->sResponseBuffer);
			if (null === $iReadLen || $bForceLogin)
			{
				$iLimit = 5000; // 5KB
				if ($iLimit < $iReadedLen)
				{
					$this->writeLogWithCrlf('[cutted:'.$iReadedLen.'] < '.\substr($this->sResponseBuffer, 0, $iLimit).'...');
				}
				else
				{
//					$this->writeLogWithCrlf('< '.$this->sResponseBuffer, //.' ['.$iReadedLen.']',
					$this->writeLogWithCrlf('< '.$this->sResponseBuffer);
				}
			}
			else
			{
				$this->writeLog('Received '.$iReadedLen.'/'.$iReadLen.' bytes.');
			}
		}
	}

	abstract function getLogName() : string;

	protected function writeLog(string $sDesc, int $iDescType = \LOG_INFO) : void
	{
		$this->oLogger && $this->oLogger->Write($sDesc, $iDescType, $this->getLogName());
	}

	protected function writeLogWithCrlf(string $sDesc) : void
	{
		$this->oLogger && $this->oLogger->Write($sDesc, \LOG_INFO, $this->getLogName(), true, true);
	}

	protected function writeLogException(\Throwable $oException,
		int $iDescType = \LOG_NOTICE, bool $bThrowException = false) : void
	{
		if ($this->oLogger)
		{
			if ($oException instanceof Exceptions\SocketCanNotConnectToHostException)
			{
				$this->oLogger->Write('Socket: ['.$oException->getSocketCode().'] '.$oException->getSocketMessage(), $iDescType, $this->getLogName());
			}

			$this->oLogger->WriteException($oException, $iDescType, $this->getLogName());
		}

		if ($bThrowException)
		{
			throw $oException;
		}
	}

	public function SetLogger(\MailSo\Log\Logger $oLogger) : void
	{
		$this->oLogger = $oLogger;
	}

	public function Logger() : ?\MailSo\Log\Logger
	{
		return $this->oLogger;
	}
}

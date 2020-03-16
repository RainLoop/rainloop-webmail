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
	protected $rConnect;

	/**
	 * @var bool
	 */
	protected $bUnreadBuffer;

	/**
	 * @var bool
	 */
	protected $bRunningCallback;

	/**
	 * @var string
	 */
	protected $sResponseBuffer;

	/**
	 * @var int
	 */
	protected $iSecurityType;

	/**
	 * @var string
	 */
	protected $sConnectedHost;

	/**
	 * @var int
	 */
	protected $iConnectedPort;

	/**
	 * @var bool
	 */
	protected $bSecure;

	/**
	 * @var int
	 */
	protected $iConnectTimeOut;

	/**
	 * @var int
	 */
	protected $iSocketTimeOut;

	/**
	 * @var int
	 */
	protected $iStartConnectTime;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger;

	/**
	 * @var bool
	 */
	public $__AUTOLOGOUT__;

	protected function __construct()
	{
		$this->rConnect = null;
		$this->bUnreadBuffer = false;
		$this->bRunningCallback = false;
		$this->oLogger = null;

		$this->__AUTOLOGOUT__ = true;

		$this->sResponseBuffer = '';

		$this->iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::NONE;
		$this->sConnectedHost = '';
		$this->iConnectedPort = 0;

		$this->bSecure = false;

		$this->iConnectTimeOut = 10;
		$this->iSocketTimeOut = 10;

		$this->Clear();
	}

	public function __destruct()
	{
		try
		{
			if ($this->__AUTOLOGOUT__)
			{
				$this->LogoutAndDisconnect();
			}
			else
			{
				$this->Disconnect();
			}
		}
		catch (\Throwable $oException) {}
	}

	public function Clear() : void
	{
		$this->sResponseBuffer = '';

		$this->sConnectedHost = '';
		$this->iConnectedPort = 0;

		$this->iStartConnectTime = 0;
		$this->bSecure = false;
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
		throw new \MailSo\Base\Exceptions\Exception($sErrStr, $iErrNo);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 * @throws \MailSo\Net\Exceptions\SocketAlreadyConnectedException
	 * @throws \MailSo\Net\Exceptions\SocketCanNotConnectToHostException
	 */
	public function Connect(string $sServerName, int $iPort,
		int $iSecurityType = \MailSo\Net\Enumerations\ConnectionSecurityType::AUTO_DETECT,
		bool $bVerifySsl = false, bool $bAllowSelfSigned = true,
		string $sClientCert = '') : void
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sServerName, true) || !\MailSo\Base\Validator::PortInt($iPort))
		{
			$this->writeLogException(
				new \MailSo\Base\Exceptions\InvalidArgumentException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		if ($this->IsConnected())
		{
			$this->writeLogException(
				new Exceptions\SocketAlreadyConnectedException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$sServerName = \trim($sServerName);

		$sErrorStr = '';
		$iErrorNo = 0;

		$this->sConnectedHost = $sServerName;
		$this->iConnectedPort = $iPort;
		$this->iSecurityType = $iSecurityType;
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
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$this->iStartConnectTime = \microtime(true);
		$this->writeLog('Start connection to "'.$this->sConnectedHost.':'.$this->iConnectedPort.'"',
			\MailSo\Log\Enumerations\Type::NOTE);

//		$this->rConnect = @\fsockopen($this->sConnectedHost, $this->iConnectedPort,
//			$iErrorNo, $sErrorStr, $this->iConnectTimeOut);

		$bVerifySsl = !!$bVerifySsl;
		$bAllowSelfSigned = $bVerifySsl ? !!$bAllowSelfSigned : true;
		$aStreamContextSettings = array(
			'ssl' => array(
				'verify_host' => $bVerifySsl,
				'verify_peer' => $bVerifySsl,
				'verify_peer_name' => $bVerifySsl,
				'allow_self_signed' => $bAllowSelfSigned
			)
		);

		if (!empty($sClientCert))
		{
			$aStreamContextSettings['ssl']['local_cert'] = $sClientCert;
		}

		\MailSo\Hooks::Run('Net.NetClient.StreamContextSettings/Filter', array(&$aStreamContextSettings));

		$rStreamContext = \stream_context_create($aStreamContextSettings);

		\set_error_handler(array(&$this, 'capturePhpErrorWithException'));

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

		$this->writeLog('Connected ('.(\is_resource($this->rConnect) ? 'success' : 'unsuccess').')',
			\MailSo\Log\Enumerations\Type::NOTE);

		if (!\is_resource($this->rConnect))
		{
			$this->writeLogException(
				new Exceptions\SocketCanNotConnectToHostException(
					\MailSo\Base\Utils::ConvertSystemString($sErrorStr), (int) $iErrorNo,
					'Can\'t connect to host "'.$this->sConnectedHost.':'.$this->iConnectedPort.'"'
				), \MailSo\Log\Enumerations\Type::NOTICE, true);
		}

		$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (raw connection)',
			\MailSo\Log\Enumerations\Type::TIME);

		if ($this->rConnect)
		{
			if (\MailSo\Base\Utils::FunctionExistsAndEnabled('stream_set_timeout'))
			{
				@\stream_set_timeout($this->rConnect, $this->iSocketTimeOut);
			}
		}
	}

	public function EnableCrypto()
	{
		$bError = true;
		if (\is_resource($this->rConnect) &&
			\MailSo\Base\Utils::FunctionExistsAndEnabled('stream_socket_enable_crypto'))
		{
			switch (true)
			{
				case defined('STREAM_CRYPTO_METHOD_ANY_CLIENT') &&
					@\stream_socket_enable_crypto($this->rConnect, true, STREAM_CRYPTO_METHOD_ANY_CLIENT):
				case defined('STREAM_CRYPTO_METHOD_TLS_CLIENT') &&
					@\stream_socket_enable_crypto($this->rConnect, true, STREAM_CRYPTO_METHOD_TLS_CLIENT):
				case defined('STREAM_CRYPTO_METHOD_SSLv23_CLIENT') &&
					@\stream_socket_enable_crypto($this->rConnect, true, STREAM_CRYPTO_METHOD_SSLv23_CLIENT):
					$bError = false;
					break;
			}
		}

		if ($bError)
		{
			$this->writeLogException(
				new \MailSo\Net\Exceptions\Exception('Cannot enable STARTTLS.'),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
	}

	public function Disconnect() : void
	{
		if (\is_resource($this->rConnect))
		{
			$bResult = \fclose($this->rConnect);

			$this->writeLog('Disconnected from "'.$this->sConnectedHost.':'.$this->iConnectedPort.'" ('.
				(($bResult) ? 'success' : 'unsuccess').')', \MailSo\Log\Enumerations\Type::NOTE);

			if (0 !== $this->iStartConnectTime)
			{
				$this->writeLog((\microtime(true) - $this->iStartConnectTime).' (net session)',
					\MailSo\Log\Enumerations\Type::TIME);

				$this->iStartConnectTime = 0;
			}

			$this->rConnect = null;
		}
	}

	/**
	 * @throws \MailSo\Net\Exceptions\Exception
	 */
	public function LogoutAndDisconnect() : void
	{
		if (\method_exists($this, 'Logout') && !$this->bUnreadBuffer && !$this->bRunningCallback)
		{
			$this->Logout();
		}

		$this->Disconnect();
	}

	public function IsConnected(bool $bThrowExceptionOnFalse = false) : bool
	{
		$bResult = \is_resource($this->rConnect);
		if (!$bResult && $bThrowExceptionOnFalse)
		{
			$this->writeLogException(
				new Exceptions\SocketConnectionDoesNotAvailableException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		return $bResult;
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
		return \is_resource($this->rConnect) && \MailSo\Base\Utils::FunctionExistsAndEnabled('stream_context_get_options')
			? \stream_context_get_params($this->rConnect) : false;
	}

	/**
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketWriteException
	 */
	protected function sendRaw(string $sRaw, bool $bWriteToLog = true, string $sFakeRaw = '') : void
	{
		if ($this->bUnreadBuffer)
		{
			$this->writeLogException(
				new Exceptions\SocketUnreadBufferException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}

		$bFake = 0 < \strlen($sFakeRaw);
		$sRaw .= "\r\n";

		if ($this->oLogger && $this->oLogger->IsShowSecter())
		{
			$bFake = false;
		}

		if ($bFake)
		{
			$sFakeRaw .= "\r\n";
		}

		$mResult = @\fwrite($this->rConnect, $sRaw);
		if (false === $mResult)
		{
			$this->IsConnected(true);

			$this->writeLogException(
				new Exceptions\SocketWriteException(),
				\MailSo\Log\Enumerations\Type::ERROR, true);
		}
		else
		{
			\MailSo\Base\Loader::IncStatistic('NetWrite', $mResult);

			if ($bWriteToLog)
			{
				$this->writeLogWithCrlf('> '.($bFake ? $sFakeRaw : $sRaw), //.' ['.$iWriteSize.']',
					$bFake ? \MailSo\Log\Enumerations\Type::SECURE : \MailSo\Log\Enumerations\Type::INFO);
			}
		}
	}

	/**
	 * @param mixed $mReadLen = null
	 *
	 * @throws \MailSo\Net\Exceptions\SocketConnectionDoesNotAvailableException
	 * @throws \MailSo\Net\Exceptions\SocketReadException
	 */
	protected function getNextBuffer($mReadLen = null, bool $bForceLogin = false) : void
	{
		if (null === $mReadLen)
		{
			$this->sResponseBuffer = @\fgets($this->rConnect);
		}
		else
		{
			$this->sResponseBuffer = '';
			$iRead = $mReadLen;
			while (0 < $iRead)
			{
				$sAddRead = @\fread($this->rConnect, $iRead);
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

			$aSocketStatus = @\stream_get_meta_data($this->rConnect);
			if (isset($aSocketStatus['timed_out']) && $aSocketStatus['timed_out'])
			{
				$this->writeLogException(
					new Exceptions\SocketReadTimeoutException(),
						\MailSo\Log\Enumerations\Type::ERROR, true);
			}
			else
			{
				$this->writeLog('Stream Meta: '.
					\print_r($aSocketStatus, true), \MailSo\Log\Enumerations\Type::ERROR);

				$this->writeLogException(
					new Exceptions\SocketReadException(),
						\MailSo\Log\Enumerations\Type::ERROR, true);
			}
		}
		else
		{
			$iReadedLen = \strlen($this->sResponseBuffer);
			if (null === $mReadLen || $bForceLogin)
			{
				$iLimit = 5000; // 5KB
				if ($iLimit < $iReadedLen)
				{
					$this->writeLogWithCrlf('[cutted:'.$iReadedLen.'] < '.\substr($this->sResponseBuffer, 0, $iLimit).'...',
						\MailSo\Log\Enumerations\Type::INFO);
				}
				else
				{
					$this->writeLogWithCrlf('< '.$this->sResponseBuffer, //.' ['.$iReadedLen.']',
						\MailSo\Log\Enumerations\Type::INFO);
				}
			}
			else
			{
				$this->writeLog('Received '.$iReadedLen.'/'.$mReadLen.' bytes.',
					\MailSo\Log\Enumerations\Type::INFO);
			}

			\MailSo\Base\Loader::IncStatistic('NetRead', $iReadedLen);
		}
	}

	protected function getLogName() : string
	{
		return 'NET';
	}

	protected function writeLog(string $sDesc, int $iDescType = \MailSo\Log\Enumerations\Type::INFO, bool $bDiplayCrLf = false) : void
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sDesc, $iDescType, $this->getLogName(), true, $bDiplayCrLf);
		}
	}

	protected function writeLogWithCrlf(string $sDesc, int $iDescType = \MailSo\Log\Enumerations\Type::INFO) : void
	{
		$this->writeLog($sDesc, $iDescType, true);
	}

	/**
	 * @param \Exception $oException
	 */
	protected function writeLogException($oException,
		int $iDescType = \MailSo\Log\Enumerations\Type::NOTICE, bool $bThrowException = false) : void
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

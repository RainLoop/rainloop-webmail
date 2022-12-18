<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2022 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Net;

/**
 * @category MailSo
 * @package Net
 */
class ConnectSettings implements \JsonSerializable
{
	public string $host;

	public int $port;

	/**
	 * stream timeout in seconds
	 */
	public int $timeout = 10;

	// none, TLS, STARTTLS
	public int $type = Enumerations\ConnectionSecurityType::AUTO_DETECT;
//	public int $type = Enumerations\ConnectionSecurityType::NONE;

	public SSLContext $ssl;
//	public bool $tls_weak = false;

	// Authentication settings use by all child classes
	public bool $useAuth = true;
	public bool $shortLogin = false;
	public array $SASLMechanisms = [
		// https://github.com/the-djmaze/snappymail/issues/182
		'SCRAM-SHA3-512',
		'SCRAM-SHA-512',
		'SCRAM-SHA-256',
		'SCRAM-SHA-1',
//		'CRAM-MD5',
		'PLAIN',
		'LOGIN'
	];
	public string $Login = '';
	public string $Password = '';
	public string $ProxyAuthUser = '';
	public string $ProxyAuthPassword = '';

	public function __construct()
	{
		$this->ssl = new SSLContext;
	}

	public static function Host() : string
	{
		return \SnappyMail\IDN::toAscii($this->host);
	}

	public static function fromArray(array $aSettings) : self
	{
		$object = new static;
		$object->host = $aSettings['host'];
		$object->port = $aSettings['port'];
		$object->type = isset($aSettings['type']) ? $aSettings['type'] : $aSettings['secure'];
		if (isset($aSettings['timeout'])) {
			$object->timeout = $aSettings['timeout'];
		}
		$object->shortLogin = !empty($aSettings['shortLogin']);
		$object->ssl = SSLContext::fromArray($aSettings['ssl'] ?? []);
		if (isset($aSettings['sasl'])) {
			$object->SASLMechanisms = $aSettings['sasl'];
		}
//		$object->tls_weak = !empty($aSettings['tls_weak']);
		return $object;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
//			'@Object' => 'Object/ConnectSettings',
			'host' => $this->host,
			'port' => $this->port,
			'type' => $this->type,
			'timeout' => $this->timeout,
			'shortLogin' => $this->shortLogin,
			'sasl' => $this->SASLMechanisms,
			'ssl' => $this->ssl
//			'tls_weak' => $this->tls_weak
		);
	}

}

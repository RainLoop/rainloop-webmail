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

use SnappyMail\SensitiveString;

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

	// Authentication settings used by all child classes
	public bool $useAuth = true;
	public bool $shortLogin = false;
	public bool $lowerLogin = true;
	public string $stripLogin = '';
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

	private string $username = '';
	private ?SensitiveString $passphrase = null;

	public function __construct()
	{
		$this->ssl = new SSLContext;
	}

	public function __get(string $name)
	{
		$name = \strtolower($name);
		if ('passphrase' === $name || 'password' === $name) {
			return $this->passphrase ? $this->passphrase->getValue() : '';
		}
		if ('username' === $name || 'login' === $name) {
			return $this->username;
		}
	}

	public function __set(string $name,
		#[\SensitiveParameter]
		$value
	) {
		$name = \strtolower($name);
		if ('passphrase' === $name || 'password' === $name) {
			$this->passphrase = \is_string($value) ? new SensitiveString($value) : $value;
		}
		if ('username' === $name || 'login' === $name) {
			$this->username = $this->fixUsername($value);
		}
	}

	public function fixUsername(string $value, bool $allowShorten = true) : string
	{
		$value = \SnappyMail\IDN::emailToAscii($value);
//		$value = \SnappyMail\IDN::emailToAscii(\MailSo\Base\Utils::Trim($value));
		// Strip the domain part
		if ($this->shortLogin && $allowShorten) {
			$value = \MailSo\Base\Utils::getEmailAddressLocalPart($value);
		}
		// Convert to lowercase
		if ($this->lowerLogin) {
			$value = \mb_strtolower($value);
		}
		// Strip certain characters
		if ($this->stripLogin) {
			$value = \explode('@', $value);
			if (isset($value[1])) {
				$domain = \array_pop($value);
			}
			$value = \str_replace(\str_split($this->stripLogin), '', $value);
			if (isset($value[1])) {
				$value[] = $domain;
			}
			$value = \implode('@', $value);
		}
		return $value;
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
		if (isset($aSettings['lowerLogin'])) {
			$object->lowerLogin = !empty($aSettings['lowerLogin']);
		}
		if (isset($aSettings['stripLogin'])) {
			$object->stripLogin = $aSettings['stripLogin'];
		}
		$object->ssl = SSLContext::fromArray($aSettings['ssl'] ?? []);
		if (!empty($aSettings['sasl']) && \is_array($aSettings['sasl'])) {
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
			'lowerLogin' => $this->lowerLogin,
			'stripLogin' => $this->stripLogin,
			'sasl' => $this->SASLMechanisms,
			'ssl' => $this->ssl
//			'tls_weak' => $this->tls_weak
		);
	}

}

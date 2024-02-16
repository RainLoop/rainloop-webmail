<?php

namespace SnappyMail;

class SMime
{
	private
		$homedir,
		// Instance of SnappyMail\SMime\OpenSSL
		$OpenSSL,
		// Instance of \SnappyMail\GPG\SMIME
		$GPGSM;

	function __construct(string $homedir)
	{
		$homedir = \rtrim($homedir, '/\\');
		// BSD 4.4 max length
		if (104 <= \strlen($homedir . '/S.gpg-agent.extra')) {
			throw new \Exception('socket name for S.gpg-agent.extra is too long');
		}
		$this->homedir = $homedir;
	}

	public static function isSupported() : bool
	{
		return SMime\OpenSSL::isSupported() || GPG\SMIME::isSupported();
	}

	private static $instance;
	public static function getInstance(string $homedir) : ?self
	{
		if (!static::$instance) {
			static::$instance = new self($homedir);
		}
		return static::$instance;
	}

	public function handler()
	{
		return $this->OpenSSL ?: $this->GPGSM;
	}

	public function getGPGSM(bool $throw = true) : ?GPG\SMIME
	{
		if (!$this->GPGSM) {
			if (GPG\SMIME::isSupported()) {
				$this->GPGSM = new GPG\SMIME($this->homedir);
			} else if ($throw) {
				throw new \Exception('GnuPG not supported');
			}
		}
		return $this->GPGSM;
	}

	public function addDecryptKey(string $fingerprint,
		#[\SensitiveParameter]
		string $passphrase
	) : bool
	{
	}

	public function addEncryptKey(string $fingerprint) : bool
	{
	}

	public function addSignKey(string $fingerprint,
		#[\SensitiveParameter]
		?string $passphrase
	) : bool
	{
	}

	public function clearDecryptKeys() : bool
	{
	}

	public function clearEncryptKeys() : bool
	{
	}

	public function clearSignKeys() : bool
	{
	}

	public function decrypt(string $text) /*: string|false */
	{
	}

	public function decryptFile(string $filename) /*: string|false */
	{
	}

	public function decryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false */
	{
	}

	public function decryptVerify(string $text, string &$plaintext) /*: array|false*/
	{
	}

	public function decryptVerifyFile(string $filename, string &$plaintext) /*: array|false*/
	{
	}

	public function deleteKey(string $keyId, bool $private) : bool
	{
	}

	public function encrypt(string $plaintext) /*: string|false*/
	{
	}

	public function encryptFile(string $filename) /*: string|false*/
	{
	}

	public function encryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false*/
	{
	}

	public function export(string $fingerprint,
		#[\SensitiveParameter]
		string $passphrase = ''
	) /*: string|false*/
	{
	}

	public function getEngineInfo() : array
	{
	}

	public function getError() /*: string|false*/
	{
	}

	public function getErrorInfo() : array
	{
	}

	public function getProtocol() : int
	{
	}

	public function generateKey(string $uid,
		#[\SensitiveParameter]
		string $passphrase
	) /*: string|false*/
	{
	}

	public function import(string $keydata) /*: array|false*/
	{
	}

	public function importFile(string $filename) /*: array|false*/
	{
	}

	public function keyInfo(string $pattern) : array
	{
	}

	public function setArmor(bool $armor = true) : bool
	{
	}

	public function setErrorMode(int $errormode) : void
	{
	}

	public function setSignMode(int $signmode) : bool
	{
	}

	public function sign(string $plaintext) /*: string|false*/
	{
	}

	public function signFile(string $filename) /*: string|false*/
	{
	}

	public function signStream($fp, /*string|resource*/ $output = null) /*: array|false*/
	{
	}

	public function verify(string $signed_text, string $signature, string &$plaintext = null) /*: array|false*/
	{
	}

	public function verifyFile(string $filename, string $signature, string &$plaintext = null) /*: array|false*/
	{
	}

	public function verifyStream(/*resource*/ $fp, string $signature, string &$plaintext = null) /*: string|false */
	{
	}

}

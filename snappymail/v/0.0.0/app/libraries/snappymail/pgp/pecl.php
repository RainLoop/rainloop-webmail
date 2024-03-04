<?php

namespace SnappyMail\PGP;

defined('GNUPG_SIG_MODE_NORMAL') || define('GNUPG_SIG_MODE_NORMAL', 0);
defined('GNUPG_SIG_MODE_DETACH') || define('GNUPG_SIG_MODE_DETACH', 1);
defined('GNUPG_SIG_MODE_CLEAR') || define('GNUPG_SIG_MODE_CLEAR', 2);

use SnappyMail\GPG\PGP as GPG;
use SnappyMail\SensitiveString;

class PECL implements \SnappyMail\PGP\PGPInterface
{
	private
		$homedir,
		// Instance of gnupg pecl extension https://www.php.net/gnupg
		$GnuPG,
		// Instance of \SnappyMail\GPG\PGP
		$GPG;

	function __construct(string $homedir)
	{
		$homedir = \rtrim($homedir, '/\\');
		// BSD 4.4 max length
		if (104 <= \strlen($homedir . '/S.gpg-agent.extra')) {
			throw new \Exception('Socket name for S.gpg-agent.extra is too long');
		}
		$this->homedir = $homedir;
//		\putenv("GNUPGHOME={$homedir}");

		$this->GnuPG = new \gnupg([
			// It is the file name of the executable program implementing this protocol which is usually path of the gpg executable.
//			'file_name' => '/usr/bin/gpg',
			// It is the directory name of the configuration directory. It also overrides GNUPGHOME environment variable that is used for the same purpose.
			'home_dir' => $homedir
		]);
		// Output is ASCII
		$this->GnuPG->setarmor(1);
/*
		$conf = "{$homedir}/gpg-agent.conf";
		if (!\file_exists($conf)) {
			\file_put_contents($conf, 'default-cache-ttl 1');
		}
		$conf = "{$homedir}/gpg.conf";
		if (!\file_exists($conf)) {
			\file_put_contents($conf, "batch\nno-comments");
		}
*/
	}

	function __destruct()
	{
		$this->GnuPG->cleardecryptkeys();
		$this->GnuPG->clearsignkeys();
	}

	public static function isSupported() : bool
	{
		return \class_exists('gnupg') && \version_compare(\phpversion('gnupg'), '1.5', '>=');
	}

	public function gnupgError()
	{
		$error = $this->GnuPG->geterrorinfo();
		if ($error) {
			throw new \Exception("{$error['gpgme_source']} {$error['generic_message']}. {$error['gpgme_message']}", $error['gpgme_code']);
		}
	}

	public function getGPG(bool $throw = true) : ?GPG
	{
		if (!$this->GPG) {
			if (GPG::isSupported()) {
				$this->GPG = new GPG($this->homedir);
			} else if ($throw) {
				throw new \Exception('GPG not supported');
			}
		}
		return $this->GPG;
	}

	/**
	 * Add a key for decryption
	 */
	public function addDecryptKey(string $fingerprint, SensitiveString $passphrase) : bool
	{
//		\SnappyMail\Log::debug('GnuPG', "addDecryptKey({$fingerprint}, {$passphrase})");
		return $this->GnuPG->adddecryptkey($fingerprint, \strval($passphrase)) || $this->gnupgError();
	}

	/**
	 * Add a key for encryption
	 */
	public function addEncryptKey(string $fingerprint) : bool
	{
		return $this->GnuPG->addencryptkey($fingerprint) || $this->gnupgError();
	}

	/**
	 * Add a key for signing
	 */
	public function addSignKey(string $fingerprint, SensitiveString $passphrase) : bool
	{
//		\SnappyMail\Log::debug('GnuPG', "addSignKey({$fingerprint}, {$passphrase})");
		return $this->GnuPG->addsignkey($fingerprint, \strval($passphrase)) || $this->gnupgError();
	}

	/**
	 * Removes all keys which were set for decryption before
	 */
	public function clearDecryptKeys() : bool
	{
		return $this->GnuPG->cleardecryptkeys();
	}

	/**
	 * Removes all keys which were set for encryption before
	 */
	public function clearEncryptKeys() : bool
	{
		return $this->GnuPG->clearencryptkeys();
	}

	/**
	 * Removes all keys which were set for signing before
	 */
	public function clearSignKeys() : bool
	{
		return $this->GnuPG->clearsignkeys();
	}

	/**
	 * Decrypts a given text
	 */
	public function decrypt(string $text) /*: string|false */
	{
		$result = $this->GnuPG->decrypt($text);
		(false === $result) && $this->gnupgError();
		return $result;
	}

	/**
	 * Decrypts a given file
	 */
	public function decryptFile(string $filename) /*: string|false */
	{
		$result = $this->GnuPG->decrypt(\file_get_contents($filename));
		(false === $result) && $this->gnupgError();
		return $result;
	}

	/**
	 * Decrypts a given resource
	 */
	public function decryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false */
	{
		if (!$fp || !\is_resource($fp)) {
			throw new \Exception('Invalid stream resource');
		}
//		\rewind($fp);
		$result = $this->GnuPG->decrypt(\stream_get_contents($fp));
		(false === $result) && $this->gnupgError();
		return $result;
	}

	/**
	 * Decrypts and verifies a given text
	 */
	public function decryptVerify(string $text, string &$plaintext) /*: array|false*/
	{
		$result = $this->GnuPG->decryptverify($text, $plaintext);
		(false === $result) && $this->gnupgError();
		return $result;
	}

	/**
	 * Decrypts and verifies a given file
	 */
	public function decryptVerifyFile(string $filename, string &$plaintext) /*: array|false*/
	{
		$result = $this->GnuPG->decryptverify(\file_get_contents($filename), $plaintext);
		(false === $result) && $this->gnupgError();
		return $result;
	}

	public function deleteKey(string $keyId, bool $private) : bool
	{
		return $this->getGPG()->deleteKey($keyId, $private);
	}

	/**
	 * Encrypts a given text
	 */
	public function encrypt(string $plaintext) /*: string|false*/
	{
		return $this->GnuPG->encrypt($plaintext) ?: $this->gnupgError();
	}

	/**
	 * Encrypts a given text
	 */
	public function encryptFile(string $filename) /*: string|false*/
	{
		return $this->GnuPG->encrypt(\file_get_contents($filename)) ?: $this->gnupgError();
	}

	public function encryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false*/
	{
		\rewind($fp);
		return $this->GnuPG->encrypt(\stream_get_contents($fp)) ?: $this->gnupgError();
	}

	/**
	 * Exports a key
	 */
	public function export(string $fingerprint, ?SensitiveString $passphrase = null) /*: string|false*/
	{
		if (null !== $passphrase) {
			return $this->getGPG()->export($fingerprint, $passphrase);
		}
		return $this->GnuPG->export($fingerprint) ?: $this->gnupgError();
	}

	/**
	 * Returns the engine info
	 */
	public function getEngineInfo() : array
	{
		return $this->GnuPG->getengineinfo();
	}

	/**
	 * Returns the errortext, if a function fails
	 */
	public function getError() /*: string|false*/
	{
		return $this->GnuPG->geterror();
	}

	/**
	 * Returns the error info
	 */
	public function getErrorInfo() : array
	{
		return $this->GnuPG->geterrorinfo();
	}

	/**
	 * Returns the currently active protocol for all operations
	 */
	public function getProtocol() : int
	{
		return $this->GnuPG->getprotocol();
	}

	/**
	 * Generates a key
	 */
	public function generateKey(string $uid, SensitiveString $passphrase) /*: string|false*/
	{
		$GPG = $this->getGPG(false);
		return $GPG ? $GPG->generateKey($uid, $passphrase) : false;
	}

	/**
	 * Imports a key
	 */
	public function import(string $keydata) /*: array|false*/
	{
		return $this->GnuPG->import($keydata);
	}

	/**
	 * Imports a key
	 */
	public function importFile(string $filename) /*: array|false*/
	{
		return $this->GnuPG->import(\file_get_contents($filename)) ?: $this->gnupgError();
	}

	public function keyInfo(string $pattern, bool $private = false) : array
	{
		return $this->GnuPG->keyinfo($pattern, $private ? 1 : 0);
	}

	/**
	 * Returns an array with information about all keys that matches the given pattern
	 */
	public function allKeysInfo(string $pattern) : array
	{
		$keys = [
			'public' => [],
			'private' => []
		];
		// Public
		foreach (($this->GnuPG->keyinfo($pattern) ?: []) as $key) {
			$key['can_verify'] = $key['can_sign'];
			unset($key['can_sign']);
			$keys['public'][] = $key;
		}
		// Private, read https://github.com/php-gnupg/php-gnupg/issues/5
		foreach (($this->GnuPG->keyinfo($pattern, 1) ?: []) as $key) {
			$key['can_decrypt'] = $key['can_encrypt'];
			unset($key['can_encrypt']);
			$keys['private'][] = $key;
		}
		return $keys;
	}

	/**
	 * Toggle armored output
	 * When true the output is ASCII
	 */
	public function setArmor(bool $armor = true) : bool
	{
		return $this->GnuPG->setarmor($armor ? 1 : 0);
	}

	/**
	 * Sets the mode for error_reporting
	 * GNUPG_ERROR_WARNING, GNUPG_ERROR_EXCEPTION and GNUPG_ERROR_SILENT.
	 * By default GNUPG_ERROR_SILENT is used.
	 */
	public function setErrorMode(int $errormode) : void
	{
		$this->GnuPG->seterrormode($errormode);
	}

	/**
	 * Sets the mode for signing
	 * GNUPG_SIG_MODE_NORMAL, GNUPG_SIG_MODE_DETACH and GNUPG_SIG_MODE_CLEAR.
	 * By default GNUPG_SIG_MODE_CLEAR
	 */
	public function setSignMode(int $signmode) : bool
	{
		return $this->GnuPG->setsignmode($signmode);
	}

	/**
	 * Signs a given text
	 */
	public function sign(string $plaintext) /*: string|false*/
	{
		return $this->GnuPG->sign($plaintext) ?: $this->gnupgError();
	}

	/**
	 * Signs a given file
	 */
	public function signFile(string $filename) /*: string|false*/
	{
		return $this->GnuPG->sign(\file_get_contents($filename)) ?: $this->gnupgError();
	}

	/**
	 * Signs a given file
	 */
	public function signStream($fp, /*string|resource*/ $output = null) /*: string|false*/
	{
		\rewind($fp);
		return $this->GnuPG->sign(\stream_get_contents($fp)) ?: $this->gnupgError();
	}

	/**
	 * Verifies a signed text
	 */
	public function verify(string $signed_text, string $signature, string &$plaintext = null) /*: array|false*/
	{
		$result = $this->GnuPG->verify($signed_text, $signature ?: false, $plaintext) ?: $this->gnupgError();
		if (!$result) {
			\SnappyMail\Log::notice('GnuPG', 'gnupg_verify() failed: ' . $this->GnuPG->geterror());
			\SnappyMail\Log::info('GnuPG', \print_r($this->GnuPG->geterrorinfo(),1));
		}
		return $result;
	}

	/**
	 * Verifies a signed file
	 */
	public function verifyFile(string $filename, string $signature, string &$plaintext = null) /*: array|false*/
	{
		return $this->GnuPG->verify(\file_get_contents($filename), $signature, $plaintext) ?: $this->gnupgError();
	}

	/**
	 * Verifies a given resource
	 */
	public function verifyStream(/*resource*/ $fp, string $signature, string &$plaintext = null) /*: array|false */
	{
		if (!$fp || !\is_resource($fp)) {
			throw new \Exception('Invalid stream resource');
		}
//		\rewind($fp);
		return $this->GnuPG->verify(\stream_get_contents($fp), $signature, $plaintext) ?: $this->gnupgError();
	}

}

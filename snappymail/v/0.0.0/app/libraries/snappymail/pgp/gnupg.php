<?php

namespace SnappyMail\PGP;

defined('GNUPG_SIG_MODE_NORMAL') || define('GNUPG_SIG_MODE_NORMAL', 0);
defined('GNUPG_SIG_MODE_DETACH') || define('GNUPG_SIG_MODE_DETACH', 1);
defined('GNUPG_SIG_MODE_CLEAR') || define('GNUPG_SIG_MODE_CLEAR', 2);

class GnuPG
{
	private
		$homedir,
		// Instance of gnupg pecl extension https://www.php.net/gnupg
		$GnuPG,
		// Instance of \SnappyMail\PGP\GPG
		$GPG;

	function __construct(string $homedir)
	{
		$homedir = \rtrim($homedir, '/\\');
		// BSD 4.4 max length
		if (104 <= \strlen($homedir . '/S.gpg-agent.extra')) {
			throw new \Exception('socket name for S.gpg-agent.extra is too long');
		}
		$this->homedir = $homedir;
//		\putenv("GNUPGHOME={$homedir}");

		if (\class_exists('gnupg') && \version_compare(\phpversion('gnupg'), '1.5', '>=')) {
			$this->GnuPG = new \gnupg([
				// It is the file name of the executable program implementing this protocol which is usually path of the gpg executable.
//				'file_name' => '/usr/bin/gpg',
				// It is the directory name of the configuration directory. It also overrides GNUPGHOME environment variable that is used for the same purpose.
				'home_dir' => $homedir
			]);
			// Output is ASCII
			$this->GnuPG->setarmor(1);
		} else {
			$this->getGPG();
		}

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

	public static function isSupported() : bool
	{
		return \class_exists('gnupg') || GPG::isSupported();
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
		return $this->GnuPG ?: $this->GPG;
	}

	public function getGPG(bool $throw = true) : ?GPG
	{
		if (!$this->GPG) {
			if (GPG::isSupported()) {
				$this->GPG = new GPG($this->homedir);
			} else if ($throw) {
				throw new \Exception('GnuPG not supported');
			}
		}
		return $this->GPG;
	}

	/**
	 * Add a key for decryption
	 */
	public function addDecryptKey(string $fingerprint, string $passphrase) : bool
	{
		return $this->handler()->adddecryptkey($fingerprint, $passphrase);
	}

	/**
	 * Add a key for encryption
	 */
	public function addEncryptKey(string $fingerprint) : bool
	{
		return $this->handler()->addencryptkey($fingerprint);
	}

	/**
	 * Add a key for signing
	 */
	public function addSignKey(string $fingerprint, ?string $passphrase) : bool
	{
		return $this->handler()->addsignkey($fingerprint, $passphrase);
	}

	/**
	 * Removes all keys which were set for decryption before
	 */
	public function clearDecryptKeys() : bool
	{
		return $this->handler()->cleardecryptkeys();
	}

	/**
	 * Removes all keys which were set for encryption before
	 */
	public function clearEncryptKeys() : bool
	{
		return $this->handler()->clearencryptkeys();
	}

	/**
	 * Removes all keys which were set for signing before
	 */
	public function clearSignKeys() : bool
	{
		return $this->handler()->clearsignkeys();
	}

	/**
	 * Decrypts a given text
	 */
	public function decrypt(string $text) /*: string|false */
	{
		return $this->GnuPG
			? $this->GnuPG->decrypt($text)
			: $this->GPG->decrypt($text);
	}

	/**
	 * Decrypts a given file
	 */
	public function decryptFile(string $filename) /*: string|false */
	{
		return $this->GnuPG
			? $this->GnuPG->decrypt(\file_get_contents($filename))
			: $this->GPG->decryptFile($filename);
	}

	/**
	 * Decrypts a given resource
	 */
	public function decryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false */
	{
		if (!$fp || !\is_resource($fp)) {
			throw new \Exception('Invalid stream resource');
		}
		return $this->GnuPG
			? $this->GnuPG->decrypt(\stream_get_contents($fp))
			: $this->GPG->decryptStream($fp, $output);
	}

	/**
	 * Decrypts and verifies a given text
	 */
	public function decryptVerify(string $text, string &$plaintext) /*: array|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->decryptverify($text, $plaintext)
			: $this->GPG->decryptverify($text, $plaintext);
	}

	/**
	 * Decrypts and verifies a given file
	 */
	public function decryptVerifyFile(string $filename, string &$plaintext) /*: array|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->decryptverify(\file_get_contents($filename), $plaintext)
			: $this->GPG->decryptverifyFile($filename, $plaintext);
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
		return $this->GnuPG
			? $this->GnuPG->encrypt($plaintext)
			: $this->GPG->encrypt($plaintext);
	}

	/**
	 * Encrypts a given text
	 */
	public function encryptFile(string $filename) /*: string|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->encrypt(\file_get_contents($filename))
			: $this->GPG->encryptFile($filename);
	}

	public function encryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false*/
	{
		\rewind($fp);
		return $this->GnuPG
			? $this->GnuPG->encrypt(\stream_get_contents($fp))
			: $this->GPG->encryptStream($fp);
	}

	/**
	 * Exports a key
	 */
	public function export(string $fingerprint, string $passphrase = '') /*: string|false*/
	{
		if ($passphrase) {
			return $this->getGPG()
				->addPassphrase($fingerprint, $passphrase)
				->exportPrivateKey($fingerprint);
		}
		return $this->GnuPG
			? $this->GnuPG->export($fingerprint)
			: $this->GPG->export($fingerprint);
	}

	/**
	 * Returns the engine info
	 */
	public function getEngineInfo() : array
	{
		return $this->handler()->getengineinfo();
	}

	/**
	 * Returns the errortext, if a function fails
	 */
	public function getError() /*: string|false*/
	{
		return $this->handler()->geterror();
	}

	/**
	 * Returns the error info
	 */
	public function getErrorInfo() : array
	{
		return $this->handler()->geterrorinfo();
	}

	/**
	 * Returns the currently active protocol for all operations
	 */
	public function getProtocol() : int
	{
		return $this->handler()->getprotocol();
	}

	/**
	 * Generates a key
	 */
	public function generateKey(string $uid, string $passphrase) /*: string|false*/
	{
		$GPG = $this->getGPG(false);
		return $GPG ? $GPG->generateKey($uid, $passphrase) : false;
	}

	/**
	 * Imports a key
	 */
	public function import(string $keydata) /*: array|false*/
	{
		return $this->handler()->import($keydata);
	}

	/**
	 * Imports a key
	 */
	public function importFile(string $filename) /*: array|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->import(\file_get_contents($filename))
			: $this->GPG->importFile($filename);
	}

	/**
	 * Returns an array with information about all keys that matches the given pattern
	 */
	public function keyInfo(string $pattern) : array
	{
		$keys = [
			'public' => [],
			'private' => []
		];
		// Public
		foreach ($this->handler()->keyinfo($pattern) as $key) {
			$key['can_verify'] = $key['can_sign'];
			unset($key['can_sign']);
			$keys['public'][] = $key;
		}
		// Private, read https://github.com/php-gnupg/php-gnupg/issues/5
		foreach ($this->handler()->keyinfo($pattern, 1) as $key) {
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
		return $this->handler()->setarmor($armor ? 1 : 0);
	}

	/**
	 * Sets the mode for error_reporting
	 * GNUPG_ERROR_WARNING, GNUPG_ERROR_EXCEPTION and GNUPG_ERROR_SILENT.
	 * By default GNUPG_ERROR_SILENT is used.
	 */
	public function setErrorMode(int $errormode) : void
	{
		$this->handler()->seterrormode($errormode);
	}

	/**
	 * Sets the mode for signing
	 * GNUPG_SIG_MODE_NORMAL, GNUPG_SIG_MODE_DETACH and GNUPG_SIG_MODE_CLEAR.
	 * By default GNUPG_SIG_MODE_CLEAR
	 */
	public function setSignMode(int $signmode) : bool
	{
		return $this->handler()->setsignmode($signmode);
	}

	/**
	 * Signs a given text
	 */
	public function sign(string $plaintext) /*: string|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->sign($plaintext)
			: $this->GPG->sign($plaintext);
	}

	/**
	 * Signs a given file
	 */
	public function signFile(string $filename) /*: string|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->sign(\file_get_contents($filename))
			: $this->GPG->signFile($filename);
	}

	/**
	 * Signs a given file
	 */
	public function signStream($fp, /*string|resource*/ $output = null) /*: array|false*/
	{
		\rewind($fp);
		return $this->GnuPG
			? $this->GnuPG->sign(\stream_get_contents($fp))
			: $this->GPG->signStream($fp);
	}

	/**
	 * Verifies a signed text
	 */
	public function verify(string $signed_text, string $signature, string &$plaintext = null) /*: array|false*/
	{
		$result = $this->GnuPG
			? $this->GnuPG->verify($signed_text, $signature ?: false, $plaintext)
			: $this->GPG->verify($signed_text, $signature, $plaintext);
		if (!$result) {
			if ($this->GnuPG) {
				\SnappyMail\Log::notice('GnuPG', 'gnupg_verify() failed: ' . $this->GnuPG->geterror());
				\SnappyMail\Log::info('GnuPG', \print_r($this->GnuPG->geterrorinfo(),1));
			} else {
				\SnappyMail\Log::notice('GPG', 'GPG->verify() failed');
			}
		}
		return $result;
	}

	/**
	 * Verifies a signed file
	 */
	public function verifyFile(string $filename, string $signature, string &$plaintext = null) /*: array|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->verify(\file_get_contents($filename), $signature, $plaintext)
			: $this->GPG->verifyFile($filename, $signature, $plaintext);
	}

	/**
	 * Verifies a given resource
	 */
	public function verifyStream(/*resource*/ $fp, string $signature, string &$plaintext = null) /*: string|false */
	{
		if (!$fp || !\is_resource($fp)) {
			throw new \Exception('Invalid stream resource');
		}
		return $this->getGPG()->verifyStream($fp, $signature, $plaintext);
	}

}

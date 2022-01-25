<?php

namespace SnappyMail\PGP;

class GnuPG
{
	private
		$homedir,
		// Instance of gnupg pecl extension
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

//		if (\version_compare(\phpversion('gnupg'), '1.5', '>=')) {
		if (\class_exists('gnupg')) {
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
	}

	public static function isSupported() : bool
	{
		return \class_exists('gnupg')
			|| \SnappyMail\PGP\GPG::isSupported();
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

	public function getGPG()
	{
		if (!$this->GPG) {
			if (!\SnappyMail\PGP\GPG::isSupported()) {
				throw new \Exception('GnuPG not supported');
			}
			$this->GPG = new \SnappyMail\PGP\GPG($this->homedir);
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

	/**
	 * Encrypts and signs a given text
	 */
	public function encryptSign(string $plaintext) /*: string|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->encryptsign($plaintext)
			: $this->GPG->encryptsign($plaintext);
	}

	/**
	 * Encrypts and signs a given text
	 */
	public function encryptSignFile(string $filename) /*: string|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->encryptsign(\file_get_contents($filename))
			: $this->GPG->encryptsignFile($filename);
	}

	/**
	 * Exports a key
	 */
	public function export(string $fingerprint) /*: string|false*/
	{
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
		if (!$this->GPG) {
			if (!\SnappyMail\PGP\GPG::isSupported()) {
				return false;
			}
			$this->GPG = new \SnappyMail\PGP\GPG($homedir);
		}
		return $this->GPG->generateKey($uid, $passphrase);
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
		$keys = [];
		// Public
		foreach ($this->handler()->keyinfo($pattern) as $info) {
			if (!$info['disabled'] && !$info['expired'] && !$info['revoked']) {
				foreach ($info['uids'] as $uid)  {
					$id = $uid['email'];
					if (isset($keys[$id])) {
						$keys[$id]['can_sign'] = $keys[$id]['can_sign'] || $info['can_sign'];
						$keys[$id]['can_encrypt'] = $keys[$id]['can_encrypt'] || $info['can_encrypt'];
					} else {
						$keys[$id] = [
							'name' => $uid['name'],
							'email' => $uid['email'],
							// Public Key tasks
							'can_verify' => $info['can_sign'],
							'can_encrypt' => $info['can_encrypt'],
							// Private Key tasks
							'can_sign' => false,
							'can_decrypt' => false,
							// The keys
							'publicKeys' => [],
							'privateKeys' => []
						];
					}
					foreach ($info['subkeys'] as $key)  {
						$keys[$id]['publicKeys'][$key['fingerprint']] = $key;
					}
				}
			}
		}
		// Private, read https://github.com/php-gnupg/php-gnupg/issues/5
		foreach ($this->handler()->keyinfo($pattern, 1) as $info) {
			if (!$info['disabled'] && !$info['expired'] && !$info['revoked']) {
				foreach ($info['uids'] as $uid)  {
					$id = $uid['email'];
					if (isset($keys[$id])) {
						$keys[$id]['can_sign'] = $keys[$id]['can_sign'] || $info['can_sign'];
						$keys[$id]['can_decrypt'] = $keys[$id]['can_decrypt'] || $info['can_encrypt'];
					} else {
						$keys[$id] = [
							'name' => $uid['name'],
							'email' => $uid['email'],
							// Public Key tasks
							'can_verify' => false,
							'can_encrypt' => false,
							// Private Key tasks
							'can_sign' => $info['can_sign'],
							'can_decrypt' => $info['can_encrypt'],
							// The keys
							'publicKeys' => [],
							'privateKeys' => []
						];
					}
					foreach ($info['subkeys'] as $key)  {
						$keys[$id]['privateKeys'][$key['fingerprint']] = $key;
					}
				}
			}
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
	 * Verifies a signed text
	 */
	public function verify(string $signed_text, string $signature, string &$plaintext = null) /*: array|false*/
	{
		return $this->GnuPG
			? $this->GnuPG->verify($signed_text, $signature, $plaintext)
			: $this->GPG->verify($signed_text, $signature, $plaintext);
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
}

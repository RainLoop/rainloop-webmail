<?php

namespace SnappyMail\PGP;

class GnuPG
{
	private
		$homedir,
		// Instance of gnupg pecl extension
		$GnuPG,
		// Instance of PEAR Crypt_GPG
		$Crypt_GPG;

	public static function isSupported() : bool
	{
		return \class_exists('gnupg')
			|| \stream_resolve_include_path('Crypt/GPG.php');
	}

	public static function getInstance(string $base_dir) : ?self
	{
		$self = null;
		$home = $base_dir . '/.gnupg';
		if (\class_exists('gnupg')) {
			$self = new self;
			$self->GnuPG = new \gnupg([
				// It is the file name of the executable program implementing this protocol which is usually path of the gpg executable.
//				'file_name' => '/usr/bin/gpg',
				// It is the directory name of the configuration directory. It also overrides GNUPGHOME environment variable that is used for the same purpose.
				'home_dir' => $home
			]);
			// Output is ASCII
			$self->GnuPG->setarmor(1);
		} else {
			/**
			 * $binary = trim(`which gpg`) ?: trim(`which gpg2`);
			 * \is_executable($binary)
			 */
			include_once 'Crypt/GPG.php';
			if (\class_exists('Crypt_GPG')) {
				$self = new self;
				$self->Crypt_GPG = new \Crypt_GPG([
//					'debug' => true,
//					'binary' => $binary,
					'homedir' => $home
				]);
			}
		}
		if ($self) {
			$self->homedir = $home;
//			\putenv("GNUPGHOME={$home}");
		}
		return $self;
	}

	/**
	 * Add a key for decryption
	 */
	public function addDecryptKey(string $fingerprint, string $passphrase) : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->adddecryptkey($fingerprint, $passphrase);
		}
		if ($this->Crypt_GPG) {
			$this->Crypt_GPG->addDecryptKey($fingerprint, $passphrase);
			return true;
		}
		return false;
	}

	/**
	 * Add a key for encryption
	 */
	public function addEncryptKey(string $fingerprint) : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->addencryptkey($fingerprint);
		}
		if ($this->Crypt_GPG) {
			$this->Crypt_GPG->addEncryptKey($fingerprint);
			return true;
		}
		return false;
	}

	/**
	 * Add a key for signing
	 */
	public function addSignKey(string $fingerprint, ?string $passphrase) : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->addsignkey($fingerprint, $passphrase);
		}
		if ($this->Crypt_GPG) {
			$this->Crypt_GPG->addSignKey($fingerprint, $passphrase);
			return true;
		}
		return false;
	}

	/**
	 * Removes all keys which were set for decryption before
	 */
	public function clearDecryptKeys() : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->cleardecryptkeys();
		}
		if ($this->Crypt_GPG) {
			$this->Crypt_GPG->clearDecryptKeys();
			return true;
		}
		return false;
	}

	/**
	 * Removes all keys which were set for encryption before
	 */
	public function clearEncryptKeys() : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->clearencryptkeys();
		}
		if ($this->Crypt_GPG) {
			$this->Crypt_GPG->clearEncryptKeys();
			return true;
		}
		return false;
	}

	/**
	 * Removes all keys which were set for signing before
	 */
	public function clearSignKeys() : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->clearsignkeys();
		}
		if ($this->Crypt_GPG) {
			$this->Crypt_GPG->clearSignKeys();
			return true;
		}
		return false;
	}

	/**
	 * Decrypts a given text
	 */
	public function decrypt(string $text) /*: string|false */
	{
		if ($this->GnuPG) {
			return $this->GnuPG->decrypt($text);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->decrypt($encryptedData);
		}
		return false;
	}

	/**
	 * Decrypts a given file
	 */
	public function decryptFile(string $filename) /*: string|false */
	{
		if ($this->GnuPG) {
			return $this->GnuPG->decrypt(\file_get_contents($filename));
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->decryptFile($filename, $decryptedFile = null);
		}
		return false;
	}

	/**
	 * Decrypts and verifies a given text
	 */
	public function decryptVerify(string $text, string &$plaintext) /*: array|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->decryptverify($text, $plaintext);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->decryptAndVerify($text, $ignoreVerifyErrors = false);
		}
		return false;
	}

	/**
	 * Decrypts and verifies a given file
	 */
	public function decryptVerifyFile(string $filename, string &$plaintext) /*: array|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->decryptverify(\file_get_contents($filename), $plaintext);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->decryptAndVerifyFile($filename, $decryptedFile = null, $ignoreVerifyErrors = false);
		}
		return false;
	}

	/**
	 * Encrypts a given text
	 */
	public function encrypt(string $plaintext) /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->encrypt($plaintext);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->encrypt($plaintext);
		}
		return false;
	}

	/**
	 * Encrypts a given text
	 */
	public function encryptFile(string $filename) /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->encrypt(\file_get_contents($filename));
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->encryptFile($filename, $encryptedFile = null);
		}
		return false;
	}

	/**
	 * Encrypts and signs a given text
	 */
	public function encryptSign(string $plaintext) /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->encryptsign($plaintext);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->encryptAndSign($plaintext);
		}
		return false;
	}

	/**
	 * Encrypts and signs a given text
	 */
	public function encryptSignFile(string $filename) /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->encryptsign(\file_get_contents($filename));
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->encryptAndSignFile($filename, $signedFile = null);
		}
		return false;
	}

	/**
	 * Exports a key
	 */
	public function export(string $fingerprint) /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->export($fingerprint);
		}
		if ($this->Crypt_GPG) {
			$this->Crypt_GPG->exportPrivateKey($fingerprint, $armor = true);
			$this->Crypt_GPG->exportPublicKey($fingerprint, $armor = true);
			return true;
		}
		return false;
	}

	/**
	 * Returns the engine info
	 */
	public function getEngineInfo() : array
	{
		if ($this->GnuPG) {
			return $this->GnuPG->getengineinfo();
		}
		if ($this->Crypt_GPG) {
			return [
				'protocol' => null,
				'file_name' => null, // $this->Crypt_GPG->binary
				'home_dir' => $this->homedir,
				'version' => $this->Crypt_GPG->getVersion()
			];
		}
		return false;
	}

	/**
	 * Returns the errortext, if a function fails
	 */
	public function getError() /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->geterror();
		}
		if ($this->Crypt_GPG) {
			return true;
		}
		return false;
	}

	/**
	 * Returns the error info
	 */
	public function getErrorInfo() : array
	{
		if ($this->GnuPG) {
			return $this->GnuPG->geterrorinfo();
		}
		if ($this->Crypt_GPG) {
			return true;
		}
		return false;
	}

	/**
	 * Returns the currently active protocol for all operations
	 */
	public function getProtocol() : int
	{
		if ($this->GnuPG) {
			return $this->GnuPG->getprotocol();
		}
		if ($this->Crypt_GPG) {
			return true;
		}
		return false;
	}

	/**
	 * Imports a key
	 */
	public function import(string $keydata) /*: array|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->import($keydata);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->importKey($keydata);
		}
		return false;
	}

	/**
	 * Imports a key
	 */
	public function importFile(string $filename) /*: array|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->import(\file_get_contents($filename));
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->importKeyFile($filename);
		}
		return false;
	}

	/**
	 * Returns an array with information about all keys that matches the given pattern
	 */
	public function keyInfo(string $pattern) : array
	{
		if ($this->GnuPG) {
			return $this->GnuPG->keyinfo($pattern);
		}
		if ($this->Crypt_GPG) {
			return true;
		}
		return false;
	}

	/**
	 * Toggle armored output
	 * When true the output is ASCII
	 */
	public function setArmor(bool $armor = true) : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->setarmor($armor ? 1 : 0);
		}
		if ($this->Crypt_GPG) {
			//$armor ? \Crypt_GPG::ARMOR_ASCII : \Crypt_GPG::ARMOR_
			return true;
		}
		return false;
	}

	/**
	 * Sets the mode for error_reporting
	 * GNUPG_ERROR_WARNING, GNUPG_ERROR_EXCEPTION and GNUPG_ERROR_SILENT.
	 * By default GNUPG_ERROR_SILENT is used.
	 */
	public function setErrorMode(int $errormode) : void
	{
		if ($this->GnuPG) {
			$this->GnuPG->seterrormode($errormode);
		}
		if ($this->Crypt_GPG) {
		}
	}

	/**
	 * Sets the mode for signing
	 * GNUPG_SIG_MODE_NORMAL, GNUPG_SIG_MODE_DETACH and GNUPG_SIG_MODE_CLEAR.
	 * By default GNUPG_SIG_MODE_CLEAR
	 */
	public function setSignMode(int $signmode) : bool
	{
		if ($this->GnuPG) {
			return $this->GnuPG->setsignmode($signmode);
		}
		if ($this->Crypt_GPG) {
			return true;
		}
		return false;
	}

	/**
	 * Signs a given text
	 */
	public function sign(string $plaintext) /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->sign($plaintext);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->sign($data, $mode = self::SIGN_MODE_NORMAL);
		}
		return false;
	}

	/**
	 * Signs a given file
	 */
	public function signFile(string $filename) /*: string|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->sign(\file_get_contents($filename));
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->signFile($filename, $signedFile = null, $mode = self::SIGN_MODE_NORMAL);
		}
		return false;
	}

	/**
	 * Verifies a signed text
	 */
	public function verify(string $signed_text, string $signature, string &$plaintext = null) /*: array|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->verify($signed_text, $signature, $plaintext);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->verify($signed_text, $signature = '');
		}
		return false;
	}

	/**
	 * Verifies a signed file
	 */
	public function verifyFile(string $filename, string $signature, string &$plaintext = null) /*: array|false*/
	{
		if ($this->GnuPG) {
			return $this->GnuPG->verify(\file_get_contents($filename), $signature, $plaintext);
		}
		if ($this->Crypt_GPG) {
			return $this->Crypt_GPG->verifyFile($filename, $signature = '');
		}
		return false;
	}

	/**
	 * RFC 4880
	 * https://datatracker.ietf.org/doc/html/rfc4880#section-5.2.3.5
	 */
	public function signatureIssuer(string $signature) /*: array|false*/
	{
		if (preg_match('/-----BEGIN PGP SIGNATURE-----(.+)-----END PGP SIGNATURE-----/', $signature, $match)) {
			// TODO: use https://github.com/singpolyma/openpgp-php ?
			$binary = \base64_decode(\trim($match[1]));
			return \strtoupper(\bin2hex(\substr($binary, 24, 8)));
		}
		return false;
	}

/*
	$this->Crypt_GPG->deletePublicKey($keyId);
	$this->Crypt_GPG->deletePrivateKey($keyId);
	$this->Crypt_GPG->getKeys($keyId = '');
	$this->Crypt_GPG->getFingerprint($keyId, $format = self::FORMAT_NONE);
	$this->Crypt_GPG->getLastSignatureInfo();
	$this->Crypt_GPG->addPassphrase($key, $passphrase);
	$this->Crypt_GPG->clearPassphrases();
	$this->Crypt_GPG->hasEncryptKeys();
	$this->Crypt_GPG->hasSignKeys();
	$this->Crypt_GPG->getWarnings();
*/
}

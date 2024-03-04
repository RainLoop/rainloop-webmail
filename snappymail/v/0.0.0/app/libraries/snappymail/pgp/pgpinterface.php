<?php

namespace SnappyMail\PGP;

use SnappyMail\SensitiveString;

interface PGPInterface
{
	public static function isSupported() : bool;
//	public function addPinentry(string $keyId, SensitiveString $passphrase) : bool;
	public function addDecryptKey(string $fingerprint, SensitiveString $passphrase) : bool;
	public function addEncryptKey(string $fingerprint) : bool;
	public function addSignKey(string $fingerprint, SensitiveString $passphrase) : bool;
	public function clearDecryptKeys() : bool;
	public function clearEncryptKeys() : bool;
	public function clearSignKeys() : bool;
	public function decrypt(string $text) /*: string|false */;
	public function decryptFile(string $filename) /*: string|false */;
	public function decryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false */;
	public function decryptVerify(string $text, string &$plaintext) /*: array|false*/;
	public function decryptVerifyFile(string $filename, string &$plaintext) /*: array|false*/;
	public function deleteKey(string $keyId, bool $private) : bool;
	public function encrypt(string $plaintext) /*: string|false*/;
	public function encryptFile(string $filename) /*: string|false*/;
	public function encryptStream(/*resource*/ $fp, /*string|resource*/ $output = null) /*: string|false*/;
	public function export(string $fingerprint, ?SensitiveString $passphrase = null) /*: string|false*/;
	public function getEngineInfo() : array;
	public function getError() /*: string|false*/;
	public function getErrorInfo() : array;
	public function getProtocol() : int;
	public function generateKey(string $uid, SensitiveString $passphrase) /*: string|false*/;
	public function import(string $keydata) /*: array|false*/;
	public function importFile(string $filename) /*: array|false*/;
	public function allKeysInfo(string $pattern) : array;
	public function setArmor(bool $armor = true) : bool;
	public function setErrorMode(int $errormode) : void;
	public function setSignMode(int $signmode) : bool;
	public function sign(string $plaintext) /*: string|false*/;
	public function signFile(string $filename) /*: string|false*/;
	public function signStream($fp, /*string|resource*/ $output = null) /*: string|false*/;
	public function verify(string $signed_text, string $signature, string &$plaintext = null) /*: array|false*/;
	public function verifyFile(string $filename, string $signature, string &$plaintext = null) /*: array|false*/;
	public function verifyStream(/*resource*/ $fp, string $signature, string &$plaintext = null) /*: array|false */;
}

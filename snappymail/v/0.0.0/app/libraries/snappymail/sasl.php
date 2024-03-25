<?php

namespace SnappyMail;

abstract class SASL
{
	public bool $base64 = true;

	abstract public function authenticate(string $authcid, string $passphrase, ?string $authzid = null) : string;

	public function challenge(string $challenge) : ?string
	{
		return null;
	}

	public function hasChallenge() : bool
	{
		return false;
	}

	public function verify(string $data) : void
	{
	}

	final public static function factory(string $type)
	{
		if (\preg_match('/^([A-Z2]+)(?:-(.+))?$/Di', $type, $m)) {
			$class = __CLASS__ . "\\{$m[1]}";
			if (\class_exists($class) && $class::isSupported($m[2] ?? '')) {
				return new $class($m[2] ?? '');
			}
		}
		throw new \ValueError("Unsupported SASL mechanism type: {$type}");
	}

	public static function isSupported(string $type) : bool
	{
		if (\preg_match('/^([A-Z2]+)(?:-(.+))?$/Di', $type, $m)) {
			$class = __CLASS__ . "\\{$m[1]}";
			return \class_exists($class) && $class::isSupported($m[2] ?? '');
		}
		return false;
	}

	final protected function decode(string $data) : string
	{
		return $this->base64 ? \base64_decode($data) : $data;
	}

	final protected function encode(string $data) : string
	{
		return $this->base64 ? \base64_encode($data) : $data;
	}

}

<?php

namespace SnappyMail;

class SensitiveString /* extends SensitiveParameterValue | SensitiveParameter */ implements \Stringable, \JsonSerializable
{
	private string $value, $nonce;
	private static ?string $key = null;

	public function __construct(
		#[\SensitiveParameter]
		string $value
	)
	{
		$this->setValue($value);
	}

	public function getValue(): string
	{
		if (\is_callable('sodium_crypto_secretbox')) {
			return \sodium_crypto_secretbox_open($this->value, $this->nonce, static::$key);
		}
		return static::xorIt($this->value);
	}

	public function setValue(
		#[\SensitiveParameter]
		string $value
	) : void
	{
		\strlen($value) && \RainLoop\Api::Actions()->logMask($value);
		if (\is_callable('sodium_crypto_secretbox')) {
			$this->nonce = \random_bytes(\SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
			if (!static::$key) {
				static::$key = \sodium_crypto_secretbox_keygen();
			}
			$this->value = \sodium_crypto_secretbox($value, $this->nonce, static::$key);
		} else {
			$this->value = static::xorIt($value);
		}
	}

	private static function xorIt(
		#[\SensitiveParameter]
		string $value
	) : string
	{
		if (!static::$key) {
			static::$key = \random_bytes(32);
		}
		$kl = \strlen(static::$key);
		$i = \strlen($value);
		while ($i--) {
			$value[$i] = $value[$i] ^ static::$key[$i % $kl];
		}
		return $value;
	}

	public function __toString(): string
	{
		return $this->getValue();
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		throw new \Exception("JSON serialization of 'SnappyMail\\SensitiveString' is not allowed");
	}

	public function __debugInfo(): array
	{
		return [];
	}

	public function __serialize(): array
	{
		throw new \Exception("Serialization of 'SnappyMail\\SensitiveString' is not allowed");
	}

	public function __unserialize(array $data): void
	{
		throw new \Exception("Unserialization of 'SnappyMail\\SensitiveString' is not allowed");
	}
}

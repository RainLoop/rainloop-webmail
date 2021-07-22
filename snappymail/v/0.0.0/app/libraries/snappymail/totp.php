<?php

namespace SnappyMail;

abstract class TOTP
{
	public function Verify(string $sSecret, string $sCode) : bool
	{
		$key = static::Base32Decode($sSecret);
		$algo = 'SHA1'; // Google Authenticator doesn't support SHA256
		$digits = 6; // Google Authenticator doesn't support 8
		$modulo = \pow(10, $digits);
		$timeSlice = \floor(\time() / 30);
		$discrepancy = 1;
		for ($i = -$discrepancy; $i <= $discrepancy; ++$i) {
			// Pack time into binary string
			$counter = \str_pad(\pack('N*', $timeSlice + $i), 8, "\x00", STR_PAD_LEFT);
			// Hash it with users secret key
			$hm = \hash_hmac($algo, $counter, $key, true);
			// Unpak 4 bytes of the result, use last nipple of result as index/offset
			$value = \unpack('N', \substr($hm, (\ord(\substr($hm, -1)) & 0x0F), 4));
			// Only 32 bits
			$value = $value[1] & 0x7FFFFFFF;
			$value = \str_pad($value % $modulo, $digits, '0', STR_PAD_LEFT);
			if (\hash_equals($value, $sCode)) {
				return true;
			}
		}
		return false;
	}

	public function CreateSecret() : string
	{
		$CHARS = \array_keys(static::$map);
		$length = 16;
		$secret = '';
		while (0 < $length--) {
			$secret .= $CHARS[\random_int(0,31)];
		}
		return $secret;
	}

	protected static $map = array(
		'A' => 0, // ord 65
		'B' => 1,
		'C' => 2,
		'D' => 3,
		'E' => 4,
		'F' => 5,
		'G' => 6,
		'H' => 7,
		'I' => 8,
		'J' => 9,
		'K' => 10,
		'L' => 11,
		'M' => 12,
		'N' => 13,
		'O' => 14,
		'P' => 15,
		'Q' => 16,
		'R' => 17,
		'S' => 18,
		'T' => 19,
		'U' => 20,
		'V' => 21,
		'W' => 22,
		'X' => 23,
		'Y' => 24,
		'Z' => 25, // ord 90
		'2' => 26, // ord 50
		'3' => 27,
		'4' => 28,
		'5' => 29,
		'6' => 30,
		'7' => 31  // ord 55
	);

	protected static function Base32Decode(string $data)
	{
		$data = \strtoupper(\rtrim($data, "=\x20\t\n\r\0\x0B"));
		$dataSize = \strlen($data);
		$buf = 0;
		$bufSize = 0;
		$res = '';
		for ($i = 0; $i < $dataSize; ++$i) {
			$c = $data[$i];
			if (isset(static::$map[$c])) {
				$buf = ($buf << 5) | static::$map[$c];
				$bufSize += 5;
				if ($bufSize > 7) {
					$bufSize -= 8;
					$res .= \chr(($buf & (0xff << $bufSize)) >> $bufSize);
				}
			}
		}
		return $res;
	}
}

<?php

namespace SnappyMail;

interface Image
{
	public static function createFromString(string $data);

	public function rotate(float $degrees) : bool;
}

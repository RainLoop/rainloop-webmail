<?php

namespace SnappyMail;

interface Image
{
	public static function createFromString(string &$data);

	public function getOrientation() : int;

	public function rotate(float $degrees) : bool;

	public function show(?string $format = null) : void;
}

<?php

if (!function_exists('imagerotate'))
{
	function imagerotate(&$srcImg, $angle, $transparentColor = null)
	{
		if (0 === ($angle % 360)) { return true; }

		$srcw = imagesx($srcImg);
		$srch = imagesy($srcImg);

		// Convert the angle to radians
		$pi = 3.141592654;
		$theta = $angle * $pi / 180;

		// Get the origin (center) of the image
		$originx = $srcw / 2;
		$originy = $srch / 2;

		// The pixels array for the new image
		$pixels = array();
		$minx = 0;
		$maxx = 0;
		$miny = 0;
		$maxy = 0;
		$dstw = 0;
		$dsth = 0;

		// Loop through every pixel and transform it
		for ($x=0; $x<$srcw; ++$x)
		{
			for ($y=0; $y<$srch; ++$y)
			{
				$x2 = $x * cos($theta) - $y * sin($theta);
				$y2 = $x * sin($theta) + $y * cos($theta);
				// Store the pixel color
				$pixels[] = array($x2, $y2, imagecolorat($srcImg, $x, $y));
				// Check our boundaries
				if ($x2 > $maxx) $maxx = $x2;
				if ($x2 < $minx) $minx = $x2;
				if ($y2 > $maxy) $maxy = $y2;
				if ($y2 < $miny) $miny = $y2;
			}
		}

		// Determine the new image size
		$dstw = $maxx - $minx + 1;
		$dsth = $maxy - $miny + 1;

		// Create our new image
		$dstImg = imagecreatetruecolor($dstw, $dsth);

		// Fill the background with our transparent color
		if (null == $transparentColor) $transparentColor = imagecolorallocate($dstImg, 1, 2, 3);
		imagecolortransparent($dstImg, $transparentColor);
		imagefilledrectangle($dstImg, 0, 0, $dstw + 1, $dsth + 1, $transparentColor);

		// Get the new origin
		$neworiginx = -$minx;
		$neworiginy = -$miny;

		// Fill in the pixels
		foreach ($pixels as $data)
		{
			list($x, $y, $color) = $data;
			$newx = $neworiginx + $x;
			$newy = $neworiginy - $y;
			imagesetpixel($dstImg, $newx, $newy, $color);
		}

		return $dstImg;
	}
}

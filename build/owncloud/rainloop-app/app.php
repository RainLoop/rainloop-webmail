<?php

if (@file_exists(__DIR__.'/app/index.php'))
{
	include_once OC_App::getAppPath('rainloop').'/lib/RainLoopHelper.php';

	OC_RainLoop_Helper::regRainLoopDataFunction();

	include __DIR__.'/app/index.php';
}

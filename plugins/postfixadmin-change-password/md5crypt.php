<?php

// md5crypt
// Action: Creates MD5 encrypted password
// Call: md5crypt (string cleartextpassword)

function md5crypt($pw, $salt = "", $magic = "")
{
    $MAGIC = "$1$";

    if ($magic == "")
	{
		$magic = $MAGIC;
	}

    if ($salt == "")
	{
		$salt = create_salt();
	}

    $slist = explode("$", $salt);
    if (isset($slist[0]) && $slist[0] == "1")
	{
		$salt = $slist[1];
	}

    $salt = substr($salt, 0, 8);
    $ctx = $pw.$magic.$salt;
    $final = hex2bin(md5($pw.$salt.$pw));

    for ($i = strlen($pw); $i > 0; $i -= 16)
    {
        if ($i > 16)
        {
            $ctx .= substr($final,0,16);
        }
        else
        {
            $ctx .= substr($final,0,$i);
        }
    }

    $i = strlen($pw);

    while ($i > 0)
    {
        if ($i & 1)
		{
			$ctx .= chr(0);
		}
        else
		{
			$ctx .= $pw[0];
		}
		
        $i = $i >> 1;
    }

    $final = hex2bin(md5($ctx));

    for ($i=0; $i<1000; $i++)
    {
        $ctx1 = "";
        if ($i & 1)
        {
            $ctx1 .= $pw;
        }
        else
        {
            $ctx1 .= substr($final,0,16);
        }
        if ($i % 3)
		{
			$ctx1 .= $salt;
		}
        if ($i % 7)
		{
			$ctx1 .= $pw;
		}
        if ($i & 1)
        {
            $ctx1 .= substr($final, 0, 16);
        }
        else
        {
            $ctx1 .= $pw;
        }

        $final = hex2bin(md5($ctx1));
    }

    $passwd = "";
    $passwd .= to64(((ord($final[0]) << 16) | (ord($final[6]) << 8) | (ord($final[12]))), 4);
    $passwd .= to64(((ord($final[1]) << 16) | (ord($final[7]) << 8) | (ord($final[13]))), 4);
    $passwd .= to64(((ord($final[2]) << 16) | (ord($final[8]) << 8) | (ord($final[14]))), 4);
    $passwd .= to64(((ord($final[3]) << 16) | (ord($final[9]) << 8) | (ord($final[15]))), 4);
    $passwd .= to64(((ord($final[4]) << 16) | (ord($final[10]) << 8) | (ord($final[5]))), 4);
    $passwd .= to64(ord($final[11]), 2);

    return $magic.$salt.'$'.$passwd;
}

function create_salt()
{
    srand((double) microtime() * 1000000);
    return substr(md5(rand(0,9999999)), 0, 8);
}

// PHP around 5.3.8 includes hex2bin as native function - http://php.net/hex2bin
if (!function_exists('hex2bin'))
{
	function hex2bin($str)
	{
		$len = strlen($str);
		$nstr = "";
		for ($i = 0; $i < $len; $i += 2)
		{
			$num = sscanf(substr($str, $i, 2), "%x");
			$nstr .= chr($num[0]);
		}

		return $nstr;
	}
}

function to64($v, $n)
{
    $ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    $ret = "";

    while (($n - 1) >= 0)
    {
        $n--;
        $ret .= $ITOA64[$v & 0x3f];
        $v = $v >> 6;
    }

    return $ret;
}
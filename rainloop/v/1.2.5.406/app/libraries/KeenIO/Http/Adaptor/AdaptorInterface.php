<?php
namespace KeenIO\Http\Adaptor;

/**
 * Class AdaptorInterface
 *
 * @package KeenIO\Http\Adaptor
 */
interface AdaptorInterface
{
    /**
     * post to the KeenIO API
     *
     * @param $url
     * @param array $parameters
     * @return mixed
     */
    public function doPost($url, array $parameters);
}

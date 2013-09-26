<?php

namespace KeenIO\Http\Adaptor;

use Buzz\Browser;
use Buzz\Client\Curl;

/**
 * Class Buzz
 * @package KeenIO\Http\Adaptor
 */
final class Buzz implements AdaptorInterface
{

    private $apiKey;
    private $browser;

    /**
     * @param $apiKey
     * @param null $client
     */
    public function __construct($apiKey)
    {
        $this->apiKey = $apiKey;
        $this->browser = new Browser(new Curl());
		$this->browser->getClient()->setVerifyPeer(false);
    }

    /**
     * post to the KeenIO API
     *
     * @param $url
     * @param array $parameters
     * @return mixed
     */
    public function doPost($url, array $parameters)
    {
        $headers = array(
//            'Authorization' => $this->apiKey,
            'Content-Type' => 'application/json'
        );

        $content = json_encode($parameters);

        $response = $this->browser->post($url, $headers, $content);

        return $response->getContent();
    }
}

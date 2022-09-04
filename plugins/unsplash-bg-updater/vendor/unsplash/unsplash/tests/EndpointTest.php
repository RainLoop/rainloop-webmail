<?php

namespace Crew\Unsplash\Tests;

use Crew\Unsplash;
use \VCR\VCR;

/**
 * Class EndpointTest
 * @package Crew\Unsplash\Tests
 */
class EndpointTest extends BaseTest
{
    public function setUp()
    {
        parent::setUp();

        Unsplash\HttpClient::init(
            [
                'clientId' => 'mock_client_id',
                'clientSecret' => 'mock_secret',
                'redirectUri' => 'none',
                'utmSource' => 'test'
            ],
            [
                'access_token' => getenv('ACCESS_TOKEN'),
                'refresh_token' => 'mock_refresh_token_1',
                'expires_in' => time() + 3600
            ]
        );
    }

    public function testRequest()
    {
        VCR::insertCassette('endpoint.yml');
        $res = Unsplash\Endpoint::__callStatic('get', ['categories/2', []]);
        VCR::eject();
        $body = json_decode($res->getBody());

        $this->assertEquals(2, $body->id);
    }

    public function testRequestWithBadMethod()
    {
        $res = Unsplash\Endpoint::__callStatic('back', ['categories/2', []]);
        $this->assertNull($res);
    }

    public function testParametersUpdate()
    {
        $endpoint = new Unsplash\Endpoint(['test' => 'mock', 'test_1' => 'mock_1']);
        $endpoint->update(['test' => 'mock_test']);

        $this->assertEquals('mock_test', $endpoint->test);
        $this->assertEquals('mock_1', $endpoint->test_1);
    }

    /**
     * @expectedException \Crew\Unsplash\Exception
     * @expectedExceptionCode 403
     */
    public function testRateLimitError()
    {
        VCR::insertCassette('endpoint.yml');
        Unsplash\Endpoint::__callStatic('get', ['categories/3', []]);
        VCR::eject();
    }

    public function testRateLimitResponseExists()
    {
        VCR::insertCassette('endpoint.yml');
        $res = Unsplash\Endpoint::__callStatic('get', ['categories/2', []]);
        VCR::eject();
        $headers = $res->getHeaders();

        $this->assertEquals('4984', $headers['X-RateLimit-Remaining'][0]);
    }
}

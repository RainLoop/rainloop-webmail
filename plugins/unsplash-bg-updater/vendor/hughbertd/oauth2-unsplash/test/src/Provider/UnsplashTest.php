<?php

namespace Unsplash\OAuth2\Client\Test;

use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use League\OAuth2\Client\Token\AccessToken;
use Unsplash\OAuth2\Client\Provider\Unsplash;
use Unsplash\OAuth2\Client\Provider\UnsplashResourceOwner;

class UnsplashTest extends \PHPUnit_Framework_TestCase
{
    /**
     * @var Unsplash
     */
    protected $provider;

    protected function setUp()
    {
        $this->provider = new Unsplash([
            'clientId'      => 'mock_client_id',
            'clientSecret'  => 'mock_secret',
            'redirectUri'   => 'none',
        ]);
    }
    public function tearDown()
    {
        \Mockery::close();
        parent::tearDown();
    }

    /**
     * Test authorizationUrl has correct query parameters
     * @return void
     */
    public function testAuthorizationUrl()
    {
        $url = $this->provider->getAuthorizationUrl();
        $uri = parse_url($url);
        parse_str($uri['query'], $query);
        $this->assertArrayHasKey('client_id', $query);
        $this->assertArrayHasKey('redirect_uri', $query);
        $this->assertArrayHasKey('state', $query);
        $this->assertArrayHasKey('scope', $query);
        $this->assertArrayHasKey('response_type', $query);
        $this->assertArrayHasKey('approval_prompt', $query);
        $this->assertNotNull($this->provider->getState());
    }

    /**
     * Test access token URL
     * @return void
     */
    public function testGetBaseAccessTokenUrl()
    {
        $params = [];
        $url = $this->provider->getBaseAccessTokenUrl($params);
        $uri = parse_url($url);
        $this->assertEquals('/oauth/token', $uri['path']);
    }

    /**
     * Test resource owner url
     * @return void
     */
    public function testGetResourceOwnerDetailsUrl()
    {
        $url = $this->provider->getResourceOwnerDetailsUrl(new AccessToken([
            'access_token' => 'accessToken123',
        ]));
        $uri = parse_url($url);
        $this->assertEquals('access_token=accessToken123', $uri['query']);
        $this->assertEquals('/me', $uri['path']);
    }

    /**
     * Test creating a resource owner, assert returned object returns correct data
     * @return void
     */
    public function testCreateResourceOwner()
    {
        $mockProvider = \Mockery::mock('Unsplash\OAuth2\Client\Provider\Unsplash')
            ->shouldDeferMissing()
            ->shouldAllowMockingProtectedMethods()
            ->shouldReceive('fetchResourceOwnerDetails')
            ->andReturn([
                'id' => '1',
                'username' => 'SamSmith123',
                'name' => 'Sam Smith',
                'first_name' => 'Sam',
                'last_name' => 'Smith'
            ])
            ->getMock();
        $resourceOwner = $mockProvider->getResourceOwner(new AccessToken(['access_token' => '123']));
        $this->assertInstanceOf(UnsplashResourceOwner::class, $resourceOwner);
        $this->assertEquals('1', $resourceOwner->getId());
        $this->assertEquals('SamSmith123', $resourceOwner->getUsername());
        $this->assertEquals('Sam', $resourceOwner->getFirstName());
        $this->assertEquals('Smith', $resourceOwner->getLastName());
        $this->assertEquals('Sam Smith', $resourceOwner->getName());
        $this->assertInternalType('array', $resourceOwner->toArray());
    }

    /**
     * Assert exception thrown during bad request
     * @expectedException \Exception
     * @expectedExceptionMessage Unauthorized: Bad request
     */
    public function testGetResponseException()
    {
        $this->setExpectedExceptionFromAnnotation();
        $mockProvider = \Mockery::mock('Unsplash\OAuth2\Client\Provider\Unsplash')
            ->shouldAllowMockingProtectedMethods()
            ->shouldDeferMissing()
            ->shouldReceive(['getResponse' => new Response(403, [], json_encode(['error' => 'Unauthorized', 'error_description' => 'Bad request']))])
            ->getMock();
        $mockProvider->getParsedResponse(new Request('GET', '/', [], '/'));
    }

    /**
     * Assert good response
     * @return void
     */
    public function testGetResponseNoException()
    {
        $this->setExpectedExceptionFromAnnotation();
        $mockProvider = \Mockery::mock('Unsplash\OAuth2\Client\Provider\Unsplash')
            ->shouldAllowMockingProtectedMethods()
            ->shouldDeferMissing()
            ->shouldReceive(['getResponse' => new Response(200, [], json_encode(['foo' => 'bar']))])
            ->getMock();
        $mockProvider->getParsedResponse(new Request('GET', '/', [], '/'));
    }
}
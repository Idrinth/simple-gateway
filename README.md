# Simple Gateway

This gateway reduces the configuration to a minimum by removing features that will not be required when starting to use a gateway. I'm open to expanding upon functionality on request, please just open an issue.

## Pre-Defined Routes

### GET /

The route provides a quick json overview over the gateway.

### HEAD /alive

This route is meant to allow for easy pull-based uptime checks. It returns a 204 Status Code on success.

### GET /open-api

This route aggregates the open-api definitions of registered services and displays a unified scheme for usage in postman for example.

## Configuration

Configuration from different sources will be merged, with ENVs overwriting file based route definitions.

### ENVs

Configuring via the environment requires setting up the following values:

- SERVICE_OPEN_API_MERGING will enable updating of the open-api document if set to `TRUE`
- SERVICE_OPEN_API_FREQUENCY defauls to 600000ms and sets the update frequency
- REQUIRED_COOKIE_NAME will set a cookie name to check for is restrict is set to cookie
- ROUTES_TARGET_ORIGIN will set an Access-Control-Allow-Origin header and defaults to *
- ROUTES_TARGET_METHODS will set the Access-Control-Allow-Methods header and filling it activates the CORS responses for all routes
- /ROUTE_[A-Z0-9_]+/i defines the request root, where requests from the gateway will be send
- /RESTRICT_[A-Z0-9_]+/i is optional and can be any of none(standard), api-key, cookie or authorization
- /OPEN_API_[A-Z0-9_]+/i defines a route to retrieve the service's open-api document from. It will default to {host}/open-api

### File (routes.idrinth.json)

This file contains a json object defining all routes, it will look similar to the following:

```json
{
    "test": {
        "target": "http://example.com",
        "require": {
            "api-key": false,
            "cookie": false,
            "authorization": false
        },
        "open-api": "http://example.com/open-api"
    }
}
```

Anything besides the key(that defines the path the gateway will route) and the target are optional.
# oas-client

[![Build Status](https://api.travis-ci.org/DiegoZoracKy/oas-client.svg)](https://travis-ci.org/DiegoZoracKy/oas-client) [![npm](https://img.shields.io/npm/v/oas-client.svg)]() [![npm](https://img.shields.io/npm/l/oas-client.svg)]()


Creates, at runtime, a fully functional api client based on an OpenAPI Specification v3. Providing automatic methods creation parameters definitions and validations. The goal is to provide consistency and a fast way to create and maintain api clients. It reduces the need of writing and preparing by hand all the necessary code to handle the communication with such servers.

 * Lightweight
 * Node.js and Browser ready
 * Automatic methods creation and parameters definitions
 * Built-in parameters validation based on the parameters spec
 * Body Schema validation (without injecting a new dependency on the project by default)
 * Path Templating handling
 * Server Variables replacement following enum specification
 * Strict mode (allowing to pass only what is presented on the specification)

## Installation

```bash
npm install oas-client --no-optional
```

**--no-optional** because **ajv** (to validate body schema) and **yamljs** (to read the spec from .yml format) are optional.

## Usage 

### Basic Example

```javascript


const specExample = {
    "openapi": "3.0.0",
    "info": {
        "version": "1.0.0",
    },
    "servers": [
        {
            "url": "https://github.com"
        }
    ],
    "paths": {
        "/{profile}": {
            "get": {
				"operationId": "fetchProfile",
				"parameters": [
                    {
                        "name": "profile",
                        "in": "path",
                        "required": true,
                        "description": "The profile to retrieve",
                        "schema": {
                            "type": "string"
                        }
                    }
                ]
			}
		},
		"/{profile}/{repository}": {
            "get": {
                "operationId": "fetchRepository"
			},
			"parameters": [
				{
					"name": "profile",
					"in": "path",
					"required": true,
					"description": "The profile to retrieve",
					"schema": {
						"type": "string"
					}
				},
				{
					"name": "repository",
					"in": "path",
					"required": true,
					"description": "The repository to retrieve",
					"schema": {
						"type": "string"
					}
				}
			]
        }
    }
};

const githubClient = oasClient.create(specExample);

// http://github.com/DiegZoracKy will be requested
githubClient.fetchProfile({data: {profile: 'DiegoZoracKy'}})
	.then(console.log)
	.catch(console.error);

// http://github.com/DiegZoracKy/oas-client will be requested
githubClient.fetchRepository({data: {profile: 'DiegoZoracKy', repository: 'oas-client'}})
	.then(console.log)
	.catch(console.error);
```

## How it works

All the **paths** and **operations** (http methods) presented on the specification becomes a method accessible by their **operationId** (when present) or by its **pathOperation** (e.g. **"GET /path"**) on the client object generated. When passing data for a method, the specification is what tells the client what to do with it. If it should be set as a querystring, as a path templating, etc.

On the following example:

```javascript
githubClient.fetchProfile({data: {profile: 'DiegoZoracKy'}})
```

The request **GET https://github.com/DiegoZoracky** will be issued, as the specification tells that **fetchProfile** is the *operationId* related to the path **/{profile}** when being called via **GET**. Also it is defined that the parameter **profile** is present on the **path**. Finally enters the information contained at **servers**, which instructs to where the request should be made.

The same operation can be called by its **pathOperation** (essential to when there is not an operationId defined):

```javascript
githubClient['GET /{profile}']({data: {profile: 'DiegoZoracKy'}})
```



## Options / Config

The **create** method accepts a second parameter with a config object:

```javascript
oasClient.create(specification, options);
```

### Validate Body *(default: false)*

In order to validate the post body following the schema defined at the property **requestBody**, set: 

`validateBody: true`.

Install de optionalDependency **ajv** to enable this feature.

### Validate Parameters *(default: true)*

By default the client will validate the parameters defined as required on the specification. When they are not passed in, an error will be returned and the request will not be performed. To turn off this validation set: 

`validateParameters: false`.

### Default Parameters

Default parameters can be set at once to all requests to be made (useful to set Authorization tokens):

```javascript
{
	defaultParameters: {
		cookie: { Authorization: 'Token!' },
	}
}
```

or by specific paths. 

```javascript
{
	paths: {
		'GET /search': {
			defaultParameters: {
				query: { 
					limit: '20' 
				}
			}
		}
	}
}				
```
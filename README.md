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
'use strict';

const axios = require('axios');
const openApiV3Parser = require('./openapi-v3-parser');
const apiClient = require('./api-client');

function fetchAndCreate(url, { expectedVersion, serverUrls, paths, defaultParameters, allowUnexpectedParams = true, validateParameters = true, validateBody, serverUrlIndex = 0 } = {}) {
	return axios.get(url).then(({ data: apiSpec }) => {
		if (expectedVersion && apiSpec.info.version !== expectedVersion) {
			return Promise.reject(`Unexpected version: Expected ${expectedVersion} but got ${apiSpec.info.version}`);
		}

		const baseServerUrlMatch = url.match(/^(https?:\/\/[^\/$]*)/);
		const baseServerUrl = baseServerUrlMatch && baseServerUrlMatch[1];
		return createApiClient(apiSpec, { baseServerUrl, serverVariables, paths, defaultParameters, allowUnexpectedParams, validateParameters, validateBody, serverUrlIndex });
	});
}

function createApiClient(apiSpec, { baseServerUrl, defaultParameters, apiSpecFormat = '', axiosConfig = {}, serverVariables = {}, paths = {}, allowUnexpectedParams = true, validateParameters = true, validateBody = false, serverUrlIndex = 0 } = {}) {

	switch (apiSpecFormat.toLowerCase()) {
		case 'json':
			apiSpec = JSON.parse(apiSpec);
			break;
		case 'yaml':
		case 'yml':
			try {
				// You have to install the dependency 'yamljs' on your own in order to set apiSpecFormat = 'yml'.
				// Because it is a dependency that is not so lightweight.
				const yaml = require('yamljs');
				apiSpec = yaml.parse(apiSpec);
			} catch (ex) {
				throw new Error(`You have to install the dependency 'yamljs' on your own in order to set apiSpecFormat = 'yml'`)
			}

			break;
	}

	const routes = openApiV3Parser.getRoutes(apiSpec, { baseServerUrl, serverVariables });
	const axiosInstance = axios.create(axiosConfig);

	// Axios defaults 'Content-Type' to 'application/json'
	axiosInstance.defaults.headers.post['Content-Type'] = 'application/json';
	axiosInstance.defaults.headers.put['Content-Type'] = 'application/json';
	axiosInstance.defaults.headers.patch['Content-Type'] = 'application/json';

	let apiClientInstance = new apiClient({
		paths,
		defaultParameters,
		allowUnexpectedParams,
		validateParameters,
		validateBody,
		serverUrlIndex,
		routes,
		axiosInstance,
	});

	return apiClientInstance;
}

module.exports = {
	fetchAndCreate,
	create: createApiClient
};
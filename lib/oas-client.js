'use strict';

const openApiV3Parser = require('./openapi-v3-parser');
const axios = require('axios');
const mop = require('make-object-path');

let Ajv;
let ajv;
try {
	// You have to install ajv on your own in order to use the feature 'validateBody' (npm install ajv)
	// Why? Because it is a dependency that is not so lightweight.
	Ajv = require('ajv');
	ajv = new Ajv({ allErrors: true });
} catch (ex) { }

function makeAxiosConfig({ method, url, expectedParameters, requestBody, data = {}, path = {}, query = {}, headers = {}, cookie = {}, body = {} }, { defaultParameters, allowUnexpectedParams, validateParameters, validateBody } = {}) {
	if (method === 'trace') {
		return Error(`Trace method is not implemented`);
	}

	const axiosConfig = { url, method, params: {}, headers: {}, cookies: {} };
	const requestParameters = { path, query, headers, cookie };

	for (let parameter of expectedParameters) {
		const locationValue = (requestParameters[parameter.in] && requestParameters[parameter.in][parameter.name])
		const dataValue = data[parameter.name];
		const defaultParameter = defaultParameters && defaultParameters[parameter.in] && defaultParameters[parameter.in][parameter.name];
		const parameterValue = locationValue || dataValue || defaultParameter;

		if (parameter.required && validateParameters && typeof (parameterValue) === 'undefined') {
			return Error(`Missing parameters: "${parameter.name}" in "${parameter.in}"`);
		}

		if (typeof (parameterValue) !== 'undefined') {
			setAxiosConfigParameter(axiosConfig, parameter.in, parameter.name, parameterValue);
		}
	}

	if (allowUnexpectedParams) {
		if (defaultParameters) {
			setAxiosConfigParameters(axiosConfig, defaultParameters);
		}

		setAxiosConfigParameters(axiosConfig, requestParameters);
	}

	mountHeaderCookieString(axiosConfig);

	if (body) {
		const contentType = axiosConfig.headers['Content-Type'] || axios.defaults.headers[method]['Content-Type'];
		const bodySchema = requestBody && requestBody.content && requestBody.content[contentType] && requestBody.content[contentType].schema;
		if (validateBody && ajv && bodySchema) {
			const validate = ajv.compile(bodySchema);
			if (!validate(body)) {
				return Error(`Invalid Body Schema: ${ajv.errorsText(validate.errors)}`);
			}
		}

		setAxiosConfigBody(axiosConfig, body);
	}

	return axiosConfig;
}

function mountHeaderCookieString(axiosConfig) {
	for (let cookie in axiosConfig.cookies) {
		if (!axiosConfig.headers.Cookie) {
			axiosConfig.headers.Cookie = '';
		}

		const value = axiosConfig.cookies[cookie];
		axiosConfig.headers.Cookie += `${cookie}=${value};`;
	}

	delete axiosConfig.cookie;
}

function setAxiosConfigBody(axiosConfig, body) {
	axiosConfig.data = body;
}

function setAxiosConfigParameters(axiosConfig, parameters) {
	for (let location in parameters) {
		for (let name in parameters[location]) {
			const value = parameters[location][name];
			setAxiosConfigParameter(axiosConfig, location, name, value);
		}
	}
}

function setAxiosConfigParameter(axiosConfig, location, name, value = "") {
	switch (location) {
		case 'path':
			axiosConfig.url = axiosConfig.url.replace(RegExp(`{${name}}`), value);
			break;

		case 'query':
			axiosConfig.params[name] = value;
			break;

		case 'header':
		case 'headers':
			axiosConfig.headers[name] = value;
			break;

		case 'cookie':
			// TODO
			axiosConfig.cookies[name] = value;
			// if(!axiosConfig.headers.Cookie) {
			// 	axiosConfig.headers.Cookie = '';
			// }

			// if(!RegExp(`(^|;)${name}=`).test(axiosConfig.headers.Cookie)) {
			// 	axiosConfig.headers.Cookie += `${name}=${value};`;
			// }

			break;
	}
}

function makeApiCall({ method, url, expectedParameters, requestBody }, { defaultParameters, allowUnexpectedParams, validateParameters = true, validateBody, axios } = {}) {
	const apiCall = ({ data, path, query, headers, cookie, body } = {}) => {
		const axiosConfig = makeAxiosConfig({
			method,
			url,
			expectedParameters,
			requestBody,
			data,
			path,
			query,
			headers,
			cookie,
			body,
			axios
		}, {
				validateParameters,
				defaultParameters,
				allowUnexpectedParams,
				validateBody
			});

		if (axiosConfig instanceof Error) {
			return Promise.reject(axiosConfig);
		}

		return axios(axiosConfig);
	};

	return apiCall;
}

function fetchAndCreate(url, { expectedVersion, serverUrls, paths, defaultParameters, allowUnexpectedParams = true, validateParameters = true, validateBody, serverUrlIndex = 0 } = {}) {

	return axios.get(url).then(({ data: apiSpec }) => {
		if (expectedVersion && apiSpec.info.version !== expectedVersion) {
			return Promise.reject(`Unexpected version: Expected ${expectedVersion} but got ${apiSpec.info.version}`);
		}

		const baseServerUrlMatch = url.match(/^(https?:\/\/[^\/$]*)/);
		const baseServerUrl = baseServerUrlMatch && baseServerUrlMatch[1];
		return createApi(apiSpec, { baseServerUrl, serverUrls, paths, defaultParameters, allowUnexpectedParams, validateParameters, validateBody, serverUrlIndex });
	});
}

function createApi(apiSpec, { baseServerUrl, serverUrls = {}, paths = {}, defaultParameters, allowUnexpectedParams = true, validateParameters = true, validateBody, serverUrlIndex = 0 } = {}) {
	// TODO :: GET AXIOS CONFIG BY PARAM
	const axiosInstance = axios.create();
	axiosInstance.defaults.headers.post['Content-Type'] = 'application/json';
	axiosInstance.defaults.headers.put['Content-Type'] = 'application/json';
	axiosInstance.defaults.headers.patch['Content-Type'] = 'application/json';

	const apiClient = {
		$operations: {}
	};

	const routes = openApiV3Parser.getRoutes(apiSpec, { baseServerUrl, serverUrls });
	routes.forEach(route => {

		const url = route.urls[serverUrlIndex];
		const method = route.method;
		const expectedParameters = route.parameters;
		const requestBody = route.requestBody;

		const methodPath = `${route.method.toUpperCase()} ${route.path}`;
		const pathConfig = paths[methodPath];
		const pathDefaultParameters = (pathConfig && pathConfig.defaultParameters) || {};
		const apiCallDefaultParameters = Object.assign({}, defaultParameters, pathDefaultParameters);

		const apiCall = makeApiCall({ method, url, expectedParameters, requestBody }, {
			validateParameters,
			allowUnexpectedParams,
			validateBody,
			defaultParameters: apiCallDefaultParameters,
			axios: axiosInstance,
		});

		// mop(apiClient.$operations, methodPath, apiCall);
		mop(apiClient, methodPath, apiCall);

		let operationId = (pathConfig && pathConfig.operationId) || route.operationId;
		if (operationId) {
			mop(apiClient, operationId, apiCall);
		}
	});

	return apiClient;
}

module.exports = {
	fetchAndCreate,
	create: createApi
};
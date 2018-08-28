'use strict';

const axios = require('axios');

let Ajv;
let ajv;
try {
	// You have to install ajv on your own in order to use the feature 'validateBody' (npm install ajv)
	// Because it is a dependency that is not so lightweight.
	Ajv = require('ajv');
	ajv = new Ajv({ allErrors: true });
} catch (ex) { }

function makeAxiosConfig({ method, url, expectedParameters, requestBody, data, path, query, headers, cookie, body }, { defaultParameters, allowUnexpectedParams, validateParameters, validateBody, contentType } = {}) {
	if (method === 'trace') {
		return Error(`Trace method is not implemented`);
	}

	const axiosConfig = { url, method, params: {}, headers: {}, cookies: {} };
	const requestParameters = { path, query, headers, cookie };

	for (let parameter of expectedParameters) {
		const locationValue = (requestParameters[parameter.in] && requestParameters[parameter.in][parameter.name])
		const dataValue = data && data[parameter.name];
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

		let axiosContentType = contentType;

		if(!axiosContentType) {
			axiosContentType = axios.defaults.headers[method]['Content-Type'];
			if(!requestBody.content[axiosContentType]) {
				const contentTypes = Object.keys(requestBody.content);
				axiosContentType = contentTypes[0];
			}
		}

		axiosConfig.headers['Content-Type'] = axiosContentType;

		if (validateBody) {
			const bodySchema = requestBody && requestBody.content && requestBody.content[axiosContentType] && requestBody.content[axiosContentType].schema;
			if (!bodySchema) {
				return Error(`Invalid Body Schema: unexpected Content-Type '${axiosContentType}'`);
			}

			if (!ajv) {
				return Error(`Dependency 'Ajv' is not installed`);
			}

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
			axiosConfig.cookies[name] = value;
			break;
	}
}

function makeApiCall({ method, url, expectedParameters, requestBody, axiosInstance }, { defaultParameters, validateParameters, allowUnexpectedParams, validateBody }) {
	function apiCall({ data, path, query, headers, cookie, body } = {}, { contentType } = {}) {

		const config = {
			method,
			url,
			expectedParameters,
			requestBody,
			data,
			path,
			query,
			headers,
			cookie,
			body
		};

		const options = {
			defaultParameters,
			validateParameters,
			allowUnexpectedParams,
			validateBody,
			contentType
		};

		const axiosConfig = makeAxiosConfig(config, options);
		if (axiosConfig instanceof Error) {
			return Promise.reject(axiosConfig);
		}

		return axiosInstance(axiosConfig);
	};

	return apiCall;
}

module.exports = makeApiCall;
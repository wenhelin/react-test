let BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';
export const sendGet = async (url, params = {}) => {
    if (params) {
        let paramsArray = [];
        Object.keys(params).forEach(key => {
            let val = toTransformValue(params[key]);
            paramsArray.push(key + '=' + val);
        })
        if (url.search(/\?/) === -1) {
            url += '?' + paramsArray.join('&');
        } else {
            url += '&' + paramsArray.join('&');
        }
    }
    return await toRequest(url, {method: 'GET'})
}

const toRequest = async (url, body = null) => {
    let buildHeaders = {
        'Content-Type': 'application/json',
        'env': "",
        'AMToken': window.AMToken,
    };
    let buildBody = {
        ...body,
        'credentials': 'include',
        'headers': buildHeaders,
    };
    const response = await fetch(BASE_URL + url, buildBody);
    return await buildRespone(response)
}

const toTransformValue = (paramValue) => {
    let result = ""
    result = paramValue.toString().replace(/([\#\?&=])/g, ($1) => {
        return encodeURIComponent($1);
    });
    return result;
}


const buildRespone = async (response) => {
    let result = null
    const status = await response.status;
    const url = await response.url;
    if (status === 401 && url.indexOf('/login') === -1) {
        // Handle unauthorized access, e.g., redirect to login
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);
    }

    try {
        if (status === 200 && response !== null) {
            result = await response.json();
        }
    } catch (error) {
        throw new Error(`Error parsing JSON response: ${error.message}`);
    }
    return {status, result};
}
import {createServer as serveHttp, IncomingMessage, ServerResponse, request as http} from 'http';
import {createServer as serveHttps, request as https} from 'https';
import {existsSync, readFileSync} from 'fs';
import {randomBytes} from 'crypto';

const getEnv = (key: string, fallback: string = ''): string => {
    if (typeof process.env[key] === 'string') {
        return process.env[key];
    }
    const lkey = key.toLowerCase();
    for (const prop of Object.keys(process.env)) {
        if (prop.toLowerCase() === lkey && typeof process.env[prop] === 'string') {
            return process.env[prop];
        }
    }
    return fallback;
}
const time = () => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()} ${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()}:${now.getUTCMilliseconds()}`
};
const log = async (request: string, message: string) => {
    console.log(`[${time()}][INFO][${request}] ${message}`);
};
const error = async (request: string, message: string) => {
    console.error(`[${time()}][ERROR][${request}] ${message}`);
};
interface Target {
    host: string,
    path: string,
    secure: boolean,
}
interface Routes {
    [id: string]: {
        target: Target,
        require: {
            'api-key': boolean,
            authorization: boolean,
            cookie: boolean,
        },
        'open-api': string
    },
}
const toTarget = (route: string): Target => {
    return {
        host: route.replace(/https?:\/\/(.+?)($|\/.*$)/i, '$1'),
        path: route.replace(/https?:\/\/.+?(\/|$)/i, '/'),
        secure: route.replace(/:.+$/, '') === 'https',
    };    
};

const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const routes: Routes = existsSync('./routes.idrinth.json') ? require('./routes.idrinth.json') : {};
const targetOrigin = getEnv('ROUTES_TARGET_ORIGIN', '*');
const cookieName = getEnv('REQUIRED_COOKIE_NAME', '');
const targetMethods = getEnv('ROUTES_TARGET_METHODS').split(',').map((element: string) => {
    return element.toUpperCase();
}).filter((element: string) => {
    return allowedMethods.includes(element);
});
const info: string = JSON.stringify({
    gateway: require('./package.json').name,
    version: require('./package.json').version || '0.0.0',
    routes: [...Object.keys(routes), 'open-api', 'alive'],
});

for (const key of Object.keys(routes)) {
    if (typeof routes[key].target === 'undefined') {
        throw new Error(`${key} has no target defined.`);
    }
    if (typeof routes[key].require === 'undefined') {
        routes[key].require = {
            authorization: false,
            cookie: false,
            'api-key': false,
        };
    }
    const route = routes[key].target;
    if (typeof route === 'string') {
        routes[key].target = toTarget(route);
    }
    if (typeof routes[key]['open-api'] === 'undefined') {
        routes[key]['open-api'] = `http${routes[key].target.secure ? 's' : ''}://${routes[key].target.host}/open-api`;
    }
}
for (const key of Object.keys(process.env)) {
    if (key.match(/^ROUTE_/i) && typeof process.env[key] === 'string' && process.env[key].match(/^http:\/\//i)) {
        const id: string = key.replace(/^ROUTE_/i, '').toLowerCase();
        const restriction = getEnv(`RESTRICT_${id}`).toUpperCase();
        const target = toTarget(process.env[key]);
        routes[id.replace(/_/g, '-')] = {
            target,
            'open-api': getEnv(`OPEN_API_${id}`, `http${target.secure ? 's' : ''}://${target.host}/open-api`),
            require: {
                'api-key': restriction === 'API-KEY',
                cookie: restriction === 'COOKIE',
                authorization: restriction === 'AUTHORIZATION',
            }
        };
    }
}
let openAPI = '';
const openAPIObject = {
    openapi: '3.0.0',
    info: {
        version: require('./package.json').version || '0.0.0',
        title: 'Simple Gateway',
        description: 'An overview of all routes routed by this gateway.',
    },
    paths: {
        '/': {
            get: {
                description: 'a short overview over the services',
                responses: {
                    '200': {
                        description: 'success',
                        schema: {
                            type: 'object',
                        },
                    },
                },
            },
            options: {
                description: 'cors response headers',
            },
        },
        '/open-api': {
            get: {
                description: 'this document',
                responses: {
                    '200': {
                        description: 'success',
                        schema: {
                            type: 'object',
                        },
                    },
                },
            },
            options: {
                description: 'cors response headers',
            },
        },
        '/alive': {
            head: {
                description: 'pull-based alive check',
                responses: {
                    '204': {
                        description: 'success',
                    },
                },
            },
        },
    }
};

const handle = (req: IncomingMessage, res: ServerResponse) => {
    const request = 'inc-' + randomBytes(16).toString('hex');
    log(request, `${req.method} ${req.url}`);
    const method: string = (req.method || 'GET').toUpperCase();
    const url: string = (req.url || '').toLowerCase();
    const first: string = url.split('/')[1] || '';
    if (method === 'HEAD') {
        if (url==='/alive') {
            log(request, `204`);
            res.writeHead(204);
            res.end();
            return;
        }
    } else if (method === 'OPTIONS') {
        if (url==='/' || url==='' || url==='/open-api') {
            log(request, `204`);
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(204);
            res.end();
            return;
        }
        if (targetMethods.length > 0) {
            log(request, `204`);
            res.setHeader('Access-Control-Allow-Methods', targetMethods.join(','));
            res.setHeader('Access-Control-Allow-Origin', targetOrigin);
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-API-KEY');
            res.writeHead(204);
            res.end();
            return;
        }
    } else if (method === 'GET') {
        if (url==='/' || url==='') {
            log(request, `200`);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200);
            res.end(info);
            return;
        }
        if (url==='/open-api') {
            log(request, `200`);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200);
            res.end(openAPI);
            return;
        }
    }
    if (typeof routes[first] === 'undefined') {
        log(request, `404`);
        res.writeHead(404);
        res.end();
        return;
    }
    const target = routes[first].target;
    if (routes[first].require.authorization) {
        if (typeof req.headers.authorization === 'undefined') {
            log(request, `401`);
            res.writeHead(401);
            res.end();
            return;
        }
        if (req.headers.authorization === '') {
            log(request, `403`);
            res.writeHead(403);
            res.end();
            return;
        }
    }
    if (routes[first].require.cookie) {
        if (typeof req.headers.cookie === 'undefined') {
            log(request, `401`);
            res.writeHead(401);
            res.end();
            return;
        }
        if (req.headers.cookie === '') {
            log(request, `403`);
            res.writeHead(403);
            res.end();
            return;
        }
        if (cookieName && req.headers.cookie === '') {
            log(request, `403`);
            res.writeHead(403);
            res.end();
            return;
        }
    }
    if (routes[first].require['api-key']) {
        if (typeof req.headers['x-api-key'] === 'undefined') {
            log(request, `401`);
            res.writeHead(401);
            res.end();
            return;
        }
        if (req.headers['x-api-key'] === '') {
            log(request, `403`);
            res.writeHead(403);
            res.end();
            return;
        }
    }
    const pass = (target.secure ? https : http)(
        {
            headers: {...req.headers, host: target.host},
            method,
            host: target.host,
            path: `${target.path}/${req.url.replace(/\/[^\/]+(\/?|$)/, '')}`,
        },
        (rs) => {
            for (const header of Object.keys(rs.headers)) {
                res.setHeader(header, rs.headers[header]);
            }
            res.writeHead(rs.statusCode || 500);
            log(request, `${rs.statusCode} -> ${rs.statusCode || 500}`);
            rs.on('data', (chunk) => {
                res.write(chunk);
            });
            rs.on('end', () => {
                res.end();
                log(request, 'response passed through');
            });
        }
    );
    pass.on('error', (e) => {
        res.writeHead(500);
        error(request, `${e.message}`);
    });
    req.on('data', (chunk) => {
        pass.write(chunk);
    });
    req.on('end', () => {
        log(request, 'request passed through');
        pass.end();
    });
};

const port = Number.parseInt(getEnv('SERVICE_HTTP_PORT', '8080'));
const cert = getEnv('SERVICE_HTTPS_CERT');
const key = getEnv('SERVICE_HTTPS_KEY');
if (cert && key) {
    if (!existsSync(key)) {
        error('server', `Key at ${key} doesn't exist.`);
        serveHttp(handle).listen(port);
        log('server', `Started http server on port ${port} with ${Object.keys(routes).length} routes.`);
    } else if (!existsSync(cert)) {
        error('server', `Cert at ${cert} doesn't exist.`);
        serveHttp(handle).listen(port);
        log('server', `Started http server on port ${port} with ${Object.keys(routes).length} routes.`);
    } else {
        serveHttps(
            {
                key: readFileSync(getEnv('SERVICE_HTTPS_KEY')),
                cert: readFileSync(getEnv('SERVICE_HTTPS_CERT'))
            },
            handle
        )
        .listen(port);
        log('server', `Started https server on port ${port} with ${Object.keys(routes).length} routes.`);
    }
} else {
    serveHttp(handle).listen(port);
    log('server', `Started http server on port ${port} with ${Object.keys(routes).length} routes.`);
}
if (getEnv('SERVICE_OPEN_API_MERGING', 'FALSE').toUpperCase() === 'TRUE') {
    log('server', 'Open-API merging enabled.');
    (() => {
        const documents: {[url: string]: {route: string, path: string}[]} = {};
        for (const route of Object.keys(routes)) {
            if (typeof documents[routes[route]['open-api']] === 'undefined') {
                documents[routes[route]['open-api']] = [];
            }
            const el = {route, path: routes[route].target.path}
            documents[routes[route]['open-api']].push(el);
        }
        const update = () => {
            log('server', `Started update for openapi document.`);
            let remaining = Object.keys(documents).length;
            for (const url of Object.keys(documents)) {
                const request = randomBytes(16).toString('hex');
                log(request, `open-api-document ${url} update started.`);
                let data = '';
                const uds = (url.match(/^https/) ? https : http)(url);
                uds.on('data', (chunk) => {
                    data += chunk;
                });
                uds.on('end', async () => {
                    log(request, `open-api-document ${url} updated.`);
                    const o = JSON.parse(data);
                    for (const r of Object.keys(o.paths)) {
                        for (const t of documents[url]) {
                            if (r.startsWith(t.path)) {
                                openAPIObject.paths[t.route + r] = o.paths[r];
                            }
                        }
                    }
                    remaining --;
                    log(request, `open-api-document ${url} routes updated, ${remaining} routes remaining.`);
                    if (remaining === 0) {
                        openAPI = JSON.stringify(openAPIObject);
                        log('server', `open-api-document fully updated.`);
                    }
                });
            }
        };
        setInterval(update, Number.parseInt(getEnv('SERVICE_OPEN_API_FREQUENCY', '60000')));
        update();
    })();
}

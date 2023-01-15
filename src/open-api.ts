import {getEnv} from './get-env';
import {Logger} from './logger';
import routes from './routes';

interface OpenAPI {
    openapi: string,
    info: {
        version: string,
        title: string,
        description: string,
    },
    paths: {
        [path: string]: {}
    };
};
const pack = require('../package.json');
let openAPI = '';
const openAPIObject: OpenAPI = {
    openapi: '3.0.0',
    info: {
        version: pack.version || '0.0.0',
        title: 'Idrinth\'s Simple Gateway',
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
export const start = (serverLogger: Logger) => {
    if (getEnv('SERVICE_OPEN_API_MERGING', 'FALSE').toUpperCase() !== 'TRUE') {
        return;
    }
    const frequency = Number.parseInt(getEnv('SERVICE_OPEN_API_FREQUENCY', '60000'));
    serverLogger.info(`Open-API merging every ${frequency} enabled.`);
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
            const logger = new Logger('open-api');
            logger.info(`Started update for openapi document.`);
            let remaining = Object.keys(documents).length;
            for (const url of Object.keys(documents)) {
                logger.info(`open-api-document ${url} update started.`);
                let data = '';
                const uds = (url.match(/^https/) ? https : http)(url);
                uds.on('data', (chunk) => {
                    data += chunk;
                });
                uds.on('end', async () => {
                    logger.info(`open-api-document ${url} updated.`);
                    const o = JSON.parse(data);
                    for (const r of Object.keys(o.paths)) {
                        for (const t of documents[url]) {
                            if (r.startsWith(t.path)) {
                                openAPIObject.paths[t.route + r] = o.paths[r];
                            }
                        }
                    }
                    remaining --;
                    logger.info(`open-api-document ${url} routes updated, ${remaining} routes remaining.`);
                    if (remaining === 0) {
                        openAPI = JSON.stringify(openAPIObject);
                        logger.info(`open-api-document fully updated.`);
                    }
                });
            }
        };
        setInterval(update, frequency);
        update();
    })();
};
export const doc = () => openAPI;
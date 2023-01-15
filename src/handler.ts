import {IncomingMessage, ServerResponse, request as http} from 'http';
import {request as https} from 'http';
import {Logger} from './logger';
import {getEnv} from './get-env';
import {existsSync} from 'fs';
import {Routes, Target} from './routes';
import routes from './routes';
import {doc} from './open-api';

const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const targetOrigin = getEnv('ROUTES_TARGET_ORIGIN', '*');
const cookieName = getEnv('REQUIRED_COOKIE_NAME', '');
const targetMethods = getEnv('ROUTES_TARGET_METHODS').split(',').map((element: string) => {
    return element.toUpperCase();
}).filter((element: string) => {
    return allowedMethods.includes(element);
});
const pack = require('../package.json');
const info: string = JSON.stringify({
    gateway: pack.name,
    version: pack.version || '0.0.0',
    routes: [...Object.keys(routes), 'open-api', 'alive'],
});

export const handle = (req: IncomingMessage, res: ServerResponse) => {
    const logger = new Logger('request');
    logger.info(`${req.method} ${req.url}`);
    const method: string = (req.method || 'GET').toUpperCase();
    const url: string = (req.url || '').toLowerCase();
    const first: string = url.split('/')[1] || '';
    if (method === 'HEAD') {
        if (url==='/alive') {
            logger.info(`204`);
            res.writeHead(204);
            res.end();
            return;
        }
    } else if (method === 'OPTIONS') {
        if (url==='/' || url==='' || url==='/open-api') {
            logger.info(`204`);
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(204);
            res.end();
            return;
        }
        if (targetMethods.length > 0) {
            logger.info(`204`);
            res.setHeader('Access-Control-Allow-Methods', targetMethods.join(','));
            res.setHeader('Access-Control-Allow-Origin', targetOrigin);
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, X-API-KEY');
            res.writeHead(204);
            res.end();
            return;
        }
    } else if (method === 'GET') {
        if (url==='/' || url==='') {
            logger.info(`200`);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200);
            res.end(info);
            return;
        }
        if (url==='/open-api') {
            logger.info(`200`);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.writeHead(200);
            res.end(doc());
            return;
        }
    }
    if (typeof routes[first] === 'undefined') {
        logger.info(`404`);
        res.writeHead(404);
        res.end();
        return;
    }
    const target = routes[first].target;
    if (routes[first].require.authorization) {
        if (typeof req.headers.authorization === 'undefined') {
            logger.info(`401`);
            res.writeHead(401);
            res.end();
            return;
        }
        if (req.headers.authorization === '') {
            logger.info(`403`);
            res.writeHead(403);
            res.end();
            return;
        }
    }
    if (routes[first].require.cookie) {
        if (typeof req.headers.cookie === 'undefined') {
            logger.info(`401`);
            res.writeHead(401);
            res.end();
            return;
        }
        if (req.headers.cookie === '') {
            logger.info(`403`);
            res.writeHead(403);
            res.end();
            return;
        }
        if (cookieName && req.headers.cookie === '') {
            logger.info(`403`);
            res.writeHead(403);
            res.end();
            return;
        }
    }
    if (routes[first].require['api-key']) {
        if (typeof req.headers['x-api-key'] === 'undefined') {
            logger.info(`401`);
            res.writeHead(401);
            res.end();
            return;
        }
        if (req.headers['x-api-key'] === '') {
            logger.info(`403`);
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
            path: `${target.path}/${(req.url || '').replace(/\/[^\/]+(\/?|$)/, '')}`,
        },
        (rs) => {
            for (const header of Object.keys(rs.headers)) {
                const val = rs.headers[header];
                if (typeof val === 'string') {
                    res.setHeader(header, val);
                }
            }
            res.writeHead(rs.statusCode || 500);
            logger.info(`${rs.statusCode} -> ${rs.statusCode || 500}`);
            rs.on('data', (chunk) => {
                res.write(chunk);
            });
            rs.on('end', () => {
                res.end();
                logger.info('response passed through');
            });
        }
    );
    pass.on('error', (e) => {
        res.writeHead(500);
        logger.error(`${e.message}`);
    });
    req.on('data', (chunk) => {
        pass.write(chunk);
    });
    req.on('end', () => {
        logger.info('request passed through');
        pass.end();
    });
};
import {getEnv} from './get-env';
import { Logger } from './logger';
import {existsSync, readFileSync} from 'fs';
import {createServer as serveHttp, IncomingMessage, ServerResponse} from 'http';
import {createServer as serveHttps} from 'https';

export const serve = (logger: Logger, handle: (req: IncomingMessage, res: ServerResponse) => void) => {
    const port = Number.parseInt(getEnv('SERVICE_HTTP_PORT', '8080'));
    const cert = getEnv('SERVICE_HTTPS_CERT');
    const key = getEnv('SERVICE_HTTPS_KEY');
    if (cert && key) {
        if (!existsSync(key)) {
            logger.error(`Key at ${key} doesn't exist.`);
            return;
        }
        if (!existsSync(cert)) {
            logger.error(`Cert at ${cert} doesn't exist.`);
            return;
        }
        serveHttps(
            {
                key: readFileSync(getEnv('SERVICE_HTTPS_KEY')),
                cert: readFileSync(getEnv('SERVICE_HTTPS_CERT'))
            },
            handle
        )
        .listen(port);
        logger.info(`Started https server on port ${port}.`);
        return;
    }
    serveHttp(handle).listen(port);
    logger.info(`Started http server on port ${port}.`);
}
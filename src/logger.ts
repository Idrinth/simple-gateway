import {randomBytes} from 'crypto';

const time = () => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()} ${now.getUTCHours()}:${now.getUTCMinutes()}:${now.getUTCSeconds()}:${now.getUTCMilliseconds()}`
};
const log = async (time: string, request: string, message: string) => {
    console.log(`[${time}][INFO][${request}] ${message}`);
};
const error = async (ime: string, request: string, message: string) => {
    console.error(`[${time}][ERROR][${request}] ${message}`);
};
export class Logger {
    private id: string;
    private type: string;
    constructor( type: string) {
        this.type = type;
        this.id = randomBytes(16).toString('hex');
    };
    private zeropad (num: Number, length: Number = 2) {
        let ret = `${num}`;
        while (ret.length < length) {
            ret = `0${ret}`;
        }
        return ret;
    };
    private time (now: Date) {
        return `${now.getUTCFullYear()}-${this.zeropad(now.getUTCMonth())}-${this.zeropad(now.getUTCDate())} ${this.zeropad(now.getUTCHours())}:${this.zeropad(now.getUTCMinutes())}:${this.zeropad(now.getUTCSeconds())}:${this.zeropad(now.getUTCMilliseconds(), 3)}`;
    };
    public info (message: string) {
        this.write(console.info, new Date(), message);
    };
    public error (message: string) {
        this.write(console.error, new Date(), message);
    };
    private async write(out: (string: string) => void, time: Date, message: string) {
        out(`[${this.time(time)}][${this.type}][${this.id}] ${message}`);
    };
};
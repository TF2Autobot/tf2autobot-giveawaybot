import path from 'path';

interface FilePaths {
    giveawayData: string;
}

interface LogPaths {
    log: string;
    error: string;
}

export interface Paths {
    files: FilePaths;
    logs: LogPaths;
}

export default function genPaths(): Paths {
    return {
        files: {
            giveawayData: path.join(__dirname, `../../files/giveaways.json`)
        },
        logs: {
            log: path.join(__dirname, `../../logs/%DATE%.log`),
            error: path.join(__dirname, `../../logs/error.log`)
        }
    };
}

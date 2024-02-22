

export class Logger {
    /**@param {import("./ui")} UI  */
    constructor(UI) {
        this.UI = UI;
        this.LevelConfig = {
            INFO: {
                color: this.UI.Colors.Gray,
                colorMessage: (v) => this.UI.hex(this.UI.Colors.Gray)(v),
                name: 'INFO'
            },
            ERROR: {
                color: this.UI.Colors.Red,
                colorMessage: (v) => this.UI.hex(this.UI.Colors.Red)(v),
                name: 'ERROR'
            },
            DEBUG: {
                color: this.UI.Colors.Navy,
                colorMessage: (v) => this.UI.hex(this.UI.Colors.Navy)(v),
                name: 'DEBUG'
            },
            LOG: {
                color: this.UI.Colors.White,
                name: 'LOG'
            },
            UNKNOWN: {
                color: this.UI.Colors.White,
                name: '-'
            }
        };
    }
    Levels = {
        INFO: 'INFO',
        ERROR: 'ERROR',
        DEBUG: 'DEBUG',
        LOG: 'LOG',
        UNKNOWN: 'UNKNOWN'
    }
    generate({ level = this.Levels.UNKNOWN, message }) {
        return `${this.UI.hex(this.LevelConfig[level].color)("[" + level + "]")} ${this.LevelConfig[level]?.colorMessage?.(message) || message}`;
    }
    log(message) {
        console.log(this.generate({ level: this.Levels.LOG, message }));
    }
    info(message) {
        console.log(this.generate({ level: this.Levels.INFO, message }));
    }
    error(message) {
        console.error(this.generate({ level: this.Levels.ERROR, message }));
    }
    debug(message) {
        console.log(this.generate({ level: this.Levels.DEBUG, message }));
    }
}




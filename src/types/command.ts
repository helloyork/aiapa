
import { CommandDefinition } from "./cli"
import { Options } from "../command";

export declare type Commands = {
    get: CommandDefinition;
    analyze: CommandDefinition;
    bin: CommandDefinition;
}

export { Options }


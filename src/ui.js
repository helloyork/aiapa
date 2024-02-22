import inquirer from "inquirer";
import chalk from "chalk";

export const Colors = {
    Red: "#FF5733",
    Green: "#33FF57",
    Blue: "#3366FF",
    Yellow: "#FFFF33",
    Purple: "#FF33FF",
    Cyan: "#33FFFF",
    White: "#FFFFFF",
    Black: "#000000",
    Gray: "#808080",
    Navy: "#000080",
};

/**
 * Prompt for text input.
 * @param {string} message - The message to display to the user.
 * @returns {Promise<string>} The user's input.
 */
export async function input(message) {
    const { answer } = await inquirer.prompt({
        type: "input",
        name: "answer",
        message,
    });
    return answer;
}

/**
 * Prompt for a password input.
 * @param {string} message - The message to display to the user.
 * @returns {Promise<string>} The user's input.
 */
export async function password(message) {
    const { answer } = await inquirer.prompt({
        type: "password",
        name: "answer",
        message,
        mask: "*",
    });
    return answer;
}

/**
 * Prompt for a confirmation.
 * @param {string} message - The message to display to the user.
 * @returns {Promise<boolean>} The user's confirmation.
 */
export async function confirm(message) {
    const { answer } = await inquirer.prompt({
        type: "confirm",
        name: "answer",
        message,
    });
    return answer;
}

/**
 * Prompt for a single selection from a list.
 * @param {string} message - The message to display to the user.
 * @param {string[]} choices - The list of choices.
 * @returns {Promise<string>} The user's selection.
 */
export async function select(message, choices) {
    const { answer } = await inquirer.prompt({
        type: "list",
        name: "answer",
        message,
        choices,
    });
    return answer;
}

/**
 * Prompt for multiple selections from a list.
 * @param {string} message - The message to display to the user.
 * @param {string[]} choices - The list of choices.
 * @returns {Promise<string[]>} The user's selections.
 */
export async function checkbox(message, choices) {
    const { answer } = await inquirer.prompt({
        type: "checkbox",
        name: "answer",
        message,
        choices,
    });
    return answer;
}

export function hex(color) {
    return chalk.hex(color);
}

export function separator() {
    return new inquirer.Separator();
}

export default {
    input,
    password,
    confirm,
    select,
    checkbox,
    hex,
    separator,
    Colors
};
